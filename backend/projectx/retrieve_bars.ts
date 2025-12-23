import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "./credentials";

interface RetrieveBarsRequest {
  contractId: string;
  live: boolean;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  unit: projectx.Unit;
  unitNumber: number;
  limit?: number; // Max 20,000
  includePartialBar?: boolean;
}

interface RetrieveBarsResponse {
  bars: projectx.Bar[];
}

export const retrieveBars = api<RetrieveBarsRequest, RetrieveBarsResponse>(
  { method: "POST", path: "/projectx/history/bars", auth: true, expose: true },
  async (req): Promise<RetrieveBarsResponse> => {
    const auth = getAuthData()!;

    // Get user-specific credentials
    const credentials = await getProjectXCredentials(auth.userID);

    // Validate limit
    if (req.limit && req.limit > 20000) {
      throw new Error("Limit cannot exceed 20,000 bars per request");
    }

    const bars = await projectx.retrieveBars({
      contractId: req.contractId,
      live: req.live,
      startTime: req.startTime,
      endTime: req.endTime,
      unit: req.unit,
      unitNumber: req.unitNumber,
      limit: req.limit,
      includePartialBar: req.includePartialBar,
      username: credentials.username,
      apiKey: credentials.apiKey,
    });

    log.info("Historical bars retrieved via ProjectX", {
      userId: auth.userID,
      contractId: req.contractId,
      barCount: bars.length,
      unit: req.unit,
      unitNumber: req.unitNumber,
    });

    return { bars };
  }
);
