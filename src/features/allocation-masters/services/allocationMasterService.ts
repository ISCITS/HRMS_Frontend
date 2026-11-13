"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

const ALLOCATION_ENTITY_TYPE_VIEW = "allocation_entity_type_view";
const ALLOCATION_ENTITY_TYPE_EDIT = "allocation_entity_type_edit";
const ALLOCATION_ENTITY_VIEW = "allocation_entity_view";
const ALLOCATION_ENTITY_EDIT = "allocation_entity_edit";

// ----------------------------------------------------------------------
// API record shapes (mirrors clsVariablePayAllocationService.serializeEntityType /
// serializeEntity on the backend - note the backend emits dates as ISO strings).
// ----------------------------------------------------------------------
export type AllocationEntityTypeApiRecord = {
  intID: number;
  strTypeCode: string;
  strTypeName: string;
  strDescription: string | null;
  blnIsActive: boolean;
  intDisplayOrder: number;
};

export type AllocationEntityApiRecord = {
  intID: number;
  intAllocationEntityTypeID: number;
  strEntityCode: string;
  strEntityName: string;
  strDescription: string | null;
  strExternalReference: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
  intDisplayOrder: number;
};

export type AllocationEntityTypeFormValues = {
  strTypeCode: string;
  strTypeName: string;
  strDescription: string;
  blnIsActive: boolean;
  strDisplayOrder: string;
};

export type AllocationEntityFormValues = {
  intAllocationEntityTypeID: number | "";
  strEntityCode: string;
  strEntityName: string;
  strDescription: string;
  strExternalReference: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
  strDisplayOrder: string;
};

export function createInitialAllocationEntityTypeForm(): AllocationEntityTypeFormValues {
  return {
    strTypeCode: "",
    strTypeName: "",
    strDescription: "",
    blnIsActive: true,
    strDisplayOrder: "10",
  };
}

export function createInitialAllocationEntityForm(): AllocationEntityFormValues {
  return {
    intAllocationEntityTypeID: "",
    strEntityCode: "",
    strEntityName: "",
    strDescription: "",
    strExternalReference: "",
    dtEffectiveFrom: "",
    dtEffectiveTo: "",
    blnIsActive: true,
    strDisplayOrder: "10",
  };
}

export function toAllocationEntityTypeFormValues(
  dicRecord: AllocationEntityTypeApiRecord,
): AllocationEntityTypeFormValues {
  return {
    strTypeCode: dicRecord.strTypeCode,
    strTypeName: dicRecord.strTypeName,
    strDescription: dicRecord.strDescription ?? "",
    blnIsActive: Boolean(dicRecord.blnIsActive),
    strDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
  };
}

export function toAllocationEntityFormValues(dicRecord: AllocationEntityApiRecord): AllocationEntityFormValues {
  return {
    intAllocationEntityTypeID: dicRecord.intAllocationEntityTypeID,
    strEntityCode: dicRecord.strEntityCode,
    strEntityName: dicRecord.strEntityName,
    strDescription: dicRecord.strDescription ?? "",
    strExternalReference: dicRecord.strExternalReference ?? "",
    dtEffectiveFrom: dicRecord.dtEffectiveFrom ?? "",
    dtEffectiveTo: dicRecord.dtEffectiveTo ?? "",
    blnIsActive: Boolean(dicRecord.blnIsActive),
    strDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
  };
}

function formatOptionalText(strValue: string) {
  const strTrimmedValue = strValue.trim();
  return strTrimmedValue ? strTrimmedValue : null;
}

// The multilingual lstTexts block is intentionally omitted - the backend defaults it
// from strTypeName / strEntityName when the list is empty.
function toEntityTypePayload(dicValues: AllocationEntityTypeFormValues) {
  return {
    strTypeCode: dicValues.strTypeCode.trim().toUpperCase(),
    strTypeName: dicValues.strTypeName.trim(),
    strDescription: formatOptionalText(dicValues.strDescription),
    blnIsActive: dicValues.blnIsActive,
    intDisplayOrder: Number(dicValues.strDisplayOrder) || 10,
  };
}

function toEntityPayload(dicValues: AllocationEntityFormValues) {
  return {
    intAllocationEntityTypeID: Number(dicValues.intAllocationEntityTypeID),
    strEntityCode: dicValues.strEntityCode.trim().toUpperCase(),
    strEntityName: dicValues.strEntityName.trim(),
    strDescription: formatOptionalText(dicValues.strDescription),
    strExternalReference: formatOptionalText(dicValues.strExternalReference),
    dtEffectiveFrom: formatOptionalText(dicValues.dtEffectiveFrom),
    dtEffectiveTo: formatOptionalText(dicValues.dtEffectiveTo),
    blnIsActive: dicValues.blnIsActive,
    intDisplayOrder: Number(dicValues.strDisplayOrder) || 10,
  };
}

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const allocationMasterService = {
  async listEntityTypes(blnActiveOnly = false): Promise<AllocationEntityTypeApiRecord[]> {
    const objResult = await requestApi<AllocationEntityTypeApiRecord[]>({
      strPath: "/allocation-masters/entity-types",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: { blnActiveOnly },
      strMenuAction: ALLOCATION_ENTITY_TYPE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getEntityType(intAllocationEntityTypeID: number): Promise<AllocationEntityTypeApiRecord> {
    const objResult = await requestApi<AllocationEntityTypeApiRecord>({
      strPath: `/allocation-masters/entity-types/${intAllocationEntityTypeID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ALLOCATION_ENTITY_TYPE_VIEW,
    });
    return objResult.Data;
  },

  async createEntityType(dicValues: AllocationEntityTypeFormValues): Promise<AllocationEntityTypeApiRecord> {
    const objResult = await requestApi<AllocationEntityTypeApiRecord>({
      strPath: "/allocation-masters/entity-types",
      strMethod: ApiRequestMethod.Post,
      objBody: toEntityTypePayload(dicValues),
      strMenuAction: ALLOCATION_ENTITY_TYPE_EDIT,
    });
    return objResult.Data;
  },

  async updateEntityType(
    intAllocationEntityTypeID: number,
    dicValues: AllocationEntityTypeFormValues,
  ): Promise<AllocationEntityTypeApiRecord> {
    const objResult = await requestApi<AllocationEntityTypeApiRecord>({
      strPath: `/allocation-masters/entity-types/${intAllocationEntityTypeID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: toEntityTypePayload(dicValues),
      strMenuAction: ALLOCATION_ENTITY_TYPE_EDIT,
    });
    return objResult.Data;
  },

  async setEntityTypeStatus(intAllocationEntityTypeID: number, blnIsActive: boolean): Promise<void> {
    await requestApi<null>({
      strPath: `/allocation-masters/entity-types/${intAllocationEntityTypeID}/status`,
      strMethod: ApiRequestMethod.Put,
      objQueryParams: { blnIsActive },
      strMenuAction: ALLOCATION_ENTITY_TYPE_EDIT,
    });
  },

  async listEntities(
    intAllocationEntityTypeID?: number | null,
    blnActiveOnly = false,
  ): Promise<AllocationEntityApiRecord[]> {
    const objResult = await requestApi<AllocationEntityApiRecord[]>({
      strPath: "/allocation-masters/entities",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: {
        intAllocationEntityTypeID: intAllocationEntityTypeID ?? undefined,
        blnActiveOnly,
      },
      strMenuAction: ALLOCATION_ENTITY_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getEntity(intAllocationEntityID: number): Promise<AllocationEntityApiRecord> {
    const objResult = await requestApi<AllocationEntityApiRecord>({
      strPath: `/allocation-masters/entities/${intAllocationEntityID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ALLOCATION_ENTITY_VIEW,
    });
    return objResult.Data;
  },

  async createEntity(dicValues: AllocationEntityFormValues): Promise<AllocationEntityApiRecord> {
    const objResult = await requestApi<AllocationEntityApiRecord>({
      strPath: "/allocation-masters/entities",
      strMethod: ApiRequestMethod.Post,
      objBody: toEntityPayload(dicValues),
      strMenuAction: ALLOCATION_ENTITY_EDIT,
    });
    return objResult.Data;
  },

  async updateEntity(
    intAllocationEntityID: number,
    dicValues: AllocationEntityFormValues,
  ): Promise<AllocationEntityApiRecord> {
    const objResult = await requestApi<AllocationEntityApiRecord>({
      strPath: `/allocation-masters/entities/${intAllocationEntityID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: toEntityPayload(dicValues),
      strMenuAction: ALLOCATION_ENTITY_EDIT,
    });
    return objResult.Data;
  },

  async setEntityStatus(intAllocationEntityID: number, blnIsActive: boolean): Promise<void> {
    await requestApi<null>({
      strPath: `/allocation-masters/entities/${intAllocationEntityID}/status`,
      strMethod: ApiRequestMethod.Put,
      objQueryParams: { blnIsActive },
      strMenuAction: ALLOCATION_ENTITY_EDIT,
    });
  },
};
