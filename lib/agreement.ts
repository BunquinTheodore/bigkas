// Agreement between model scores and human ratings, as in the design, section 8.
import { applyFit, fitPipeline, humanReference, speakerMae, type Fit } from "./calibration";
import { CATEGORIES, MODELS } from "./config";
import { recordOf } from "./records";
import type { Category, Method, ModelId, SampleRow, ScoreSet } from "./types";

export interface MethodStats {
  mae: number | null;
  rmse: number | null;
  spearman: number | null;
}

export interface ModelReport {
  coverage: number;
  methods: Record<Method, MethodStats>;
}

export interface CategoryReport {
  speakers: number;
  items: number;
  models: Record<ModelId, ModelReport>;
}

export type Fits = Record<ModelId, Record<Category, Fit | null>>;

interface ComparedRow {
  speaker: string;
  target: number;
  scores: Record<ModelId, ScoreSet>;
}

export const METHODS: readonly Method[] = ["normalized", "linear", "ridge"];
const RATERS = 3;

const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Mean of the three ratings, or null unless all three are present. */
export function meanRating(ratings: readonly (number | null)[]): number | null {
  const present = ratings.filter((r): r is number => r !== null);
  return ratings.length === RATERS && present.length === RATERS ? mean(present) : null;
}

/** Squared error averaged per speaker, then across speakers, then the square root. */
export function speakerRmse(errors: readonly { speaker: string; error: number }[]): number | null {
  const speakers = [...new Set(errors.map((e) => e.speaker))];
  if (speakers.length === 0) return null;
  const perSpeaker = speakers.map((s) => mean(errors.filter((e) => e.speaker === s).map((e) => e.error ** 2)));
  return Math.sqrt(mean(perSpeaker));
}

/** Ranks starting at 1, tied values share their average rank. */
function averageRanks(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => (sorted.indexOf(v) + sorted.lastIndexOf(v)) / 2 + 1);
}

function pearson(a: readonly number[], b: readonly number[]): number | null {
  const meanA = mean(a);
  const meanB = mean(b);
  const covariance = a.reduce((sum, v, i) => sum + (v - meanA) * (b[i] - meanB), 0);
  const spreadA = a.reduce((sum, v) => sum + (v - meanA) ** 2, 0);
  const spreadB = b.reduce((sum, v) => sum + (v - meanB) ** 2, 0);
  if (spreadA === 0 || spreadB === 0) return null;
  return covariance / Math.sqrt(spreadA * spreadB);
}

export function spearman(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  return pearson(averageRanks(a), averageRanks(b));
}

/** Fits all nine model and category pairs on calibration rows. */
export function fitAll(calibration: readonly SampleRow[]): Fits {
  return recordOf(MODELS, (model) =>
    recordOf(CATEGORIES, (category) =>
      fitPipeline(
        calibration.map((row) => ({
          speaker: row.speaker,
          native: row.native[model][category],
          meanRating: meanRating(row.ratings[category]),
        })),
      ),
    ),
  );
}

/** Held out rows where every model has every value and all raters answered. */
function comparedRows(test: readonly SampleRow[], fits: Fits, category: Category): ComparedRow[] {
  return test.flatMap((row) => {
    const rating = meanRating(row.ratings[category]);
    if (rating === null) return [];
    const scores = recordOf(MODELS, (m) => applyFit(row.native[m][category], fits[m][category]));
    const complete = MODELS.every((m) => METHODS.every((k) => scores[m][k] !== null));
    return complete ? [{ speaker: row.speaker, target: humanReference(rating), scores }] : [];
  });
}

function methodStats(rows: readonly ComparedRow[], model: ModelId, method: Method): MethodStats {
  const predicted = rows.map((r) => r.scores[model][method] as number);
  const errors = rows.map((r, i) => ({ speaker: r.speaker, error: predicted[i] - r.target }));
  return {
    mae: speakerMae(errors),
    rmse: speakerRmse(errors),
    spearman: spearman(predicted, rows.map((r) => r.target)),
  };
}

function categoryReport(test: readonly SampleRow[], fits: Fits, category: Category): CategoryReport {
  const compared = comparedRows(test, fits, category);
  const coverage = (m: ModelId) =>
    test.length === 0 ? 0 : test.filter((r) => r.native[m][category] !== null).length / test.length;
  return {
    speakers: new Set(compared.map((r) => r.speaker)).size,
    items: compared.length,
    models: recordOf(MODELS, (m) => ({
      coverage: coverage(m),
      methods: recordOf(METHODS, (method) => methodStats(compared, m, method)),
    })),
  };
}

export function buildReport(rows: readonly SampleRow[], fits: Fits): Record<Category, CategoryReport> {
  const test = rows.filter((r) => r.split === "test");
  return recordOf(CATEGORIES, (category) => categoryReport(test, fits, category));
}
