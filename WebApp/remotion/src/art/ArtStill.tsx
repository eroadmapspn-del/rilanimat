import React from "react";
import { Art } from "./Art";
import type { ArtSpec } from "./types";

/** One illustrated shot on its own, for `remotion still` contact sheets and Remotion Studio. */
export const ArtStill: React.FC<{ spec: ArtSpec }> = ({ spec }) => <Art spec={spec} />;
