import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "./credentials";

interface GetContractRequest {
  contractId: string;
}

interface GetContractResponse {
  contract: projectx.ProjectXContract;
}

export const getContract = api<GetContractRequest, GetContractResponse>(
  { method: "GET", path: "/projectx/contract/:contractId", auth: true, expose: true },
  async (req): Promise<GetContractResponse> => {
    const auth = getAuthData()!;

    // Get user-specific credentials
    const credentials = await getProjectXCredentials(auth.userID);

    const contract = await projectx.searchContractById(
      req.contractId,
      credentials.username,
      credentials.apiKey
    );

    log.info("Contract retrieved via ProjectX", {
      userId: auth.userID,
      contractId: req.contractId,
      contractName: contract.name,
    });

    return { contract };
  }
);
