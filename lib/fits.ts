// The sample dataset and the calibration fitted on its calibration speakers.
import sample from "../data/sample-dataset.json";
import { fitAll, type Fits } from "./agreement";
import type { SampleRow } from "./types";

export const SAMPLE_ROWS = sample as unknown as readonly SampleRow[];

export const FITS: Fits = fitAll(SAMPLE_ROWS.filter((row) => row.split === "calibration"));
