from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.DependencyContainer import (
    getAuthorizationContextService,
    getMasterService,
    getTenantRepository,
)
from app.exceptions.CustomExceptions import (
    AppException,
    ForbiddenException,
    UnauthorizedException,
)
from app.schemas.MasterSchema import (
    clsBankRequestSchema,
    clsBulkDeleteRequestSchema,
    clsBulkStatusRequestSchema,
    clsCostCenterRequestSchema,
    clsCountryRequestSchema,
    clsDepartmentRequestSchema,
    clsDesignationRequestSchema,
    clsEmployeeAddressRequestSchema,
    clsEmployeeBankAccountRequestSchema,
    clsEmployeeExperienceRequestSchema,
    clsEmployeeFamilyDetailRequestSchema,
    clsEmployeeRequestSchema,
    clsEmployeeQualificationRequestSchema,
    clsEmployeeStatutoryRequestSchema,
    clsGradeRequestSchema,
    clsLocationRequestSchema,
    clsPayrollCycleRequestSchema,
    clsPayrollCycleStatusRequestSchema,
    clsTaxRegimeRequestSchema,
    clsTaxRegimeStatusRequestSchema,
    clsVersionLogRequestSchema,
    clsVersionLogStatusRequestSchema,
    clsTaxSlabSaveRequestSchema,
    clsSalaryComponentRequestSchema,
    clsSalaryComponentStatusRequestSchema,
    clsLocalizedRecordLookupRequestSchema,
    clsRecordLookupRequestSchema,
    clsSalaryStructureCloneRequestSchema,
    clsSalaryStructurePreviewRequestSchema,
    clsSalaryStructureRequestSchema,
    clsSalaryStructureStatusRequestSchema,
    clsStateRequestSchema,
    clsTranslationRequestSchema,
    clsUserRequestSchema,
)

from app.services.MasterService import clsMasterService
from app.services.AuthorizationContextService import clsAuthorizationContextService
from app.repositories.TenantRepository import clsTenantRepository
from app.utilities.ResponseHelper import buildResponse

objRouter = APIRouter(prefix="/masters", tags=["Master"])
objLogger = logging.getLogger(__name__)
tplDepartmentModuleCodes = ("DEPARTMENT", "DEPARTMENTS", "MASTER_DEPARTMENT")
tplSalaryComponentModuleCodes = (
    "SALARY_COMPONENT",
    "SALARY_COMPONENTS",
    "MASTER_SALARY_COMPONENT",
)
tplEssDeclarationModuleCodes = (
    "ESS_DECLARATION",
    "ESS_DECLARATIONS",
    "ESS_DECLARATION_CATEGORY",
    "ESS_DECLARATION_CATEGORIES",
    "MASTER_ESS_DECLARATION_CATEGORY",
    "TAX_DECLARATION_COMPONENT",
    "TAX_DECLARATION_COMPONENTS",
    "MASTER_TAX_DECLARATION_COMPONENT",
)
tplSalaryStructureModuleCodes = (
    "SALARY_STRUCTURE",
    "SALARY_STRUCTURES",
    "MASTER_SALARY_STRUCTURE",
)
tplPayrollCycleModuleCodes = (
    "PAYROLL_CYCLE",
    "PAYROLL_CYCLES",
    "MASTER_PAYROLL_CYCLE",
)
tplPayrollProcessLogModuleCodes = (
    "PAYROLL_PROCESS_LOG",
    "PAYROLL_PROCESS_LOGS",
    "MASTER_PAYROLL_PROCESS_LOG",
)
tplTaxRegimeModuleCodes = (
    "TAX_REGIME",
    "TAX_REGIMES",
    "MASTER_TAX_REGIME",
    "TAX_SLAB",
    "TAX_SLABS",
    "MASTER_TAX_SLAB",
)
tplVersionLogModuleCodes = (
    "VERSION_LOG",
    "VERSION_LOGS",
    "MASTER_VERSION_LOG",
    "VERSION_LOG_MASTER",
)


def getRequestContext(objRequest: Request) -> tuple[int, int]:
    # Master routes reuse session context populated by auth middleware, with header fallback for local/manual calls.
    dicSession = getattr(objRequest.state, "dicSession", {}) or {}
    intTenantID = int(
        dicSession.get("intTenantID") or objRequest.headers.get("X-Tenant-Id") or 1
    )
    intCompanyID = int(
        dicSession.get("intCompanyID") or objRequest.headers.get("X-Company-Id") or 1
    )
    return intTenantID, intCompanyID


def getRequestUserID(objRequest: Request) -> int | None:
    dicSession = getattr(objRequest.state, "dicSession", {}) or {}
    objUserID = dicSession.get("intUserID") or objRequest.headers.get("X-User-Id")
    return int(objUserID) if objUserID else None


def getRequestLanguageID(objRequest: Request) -> int | None:
    dicSession = getattr(objRequest.state, "dicSession", {}) or {}
    dicClaims = getattr(objRequest.state, "dicClaims", {}) or {}
    objLanguageID = (
        dicSession.get("intLanguageID")
        or dicClaims.get("language_id")
        or objRequest.headers.get("X-Language-Id")
    )
    return int(objLanguageID) if objLanguageID else None


async def resolveTranslationRequest(
    intTenantID: int,
    objPayload: clsTranslationRequestSchema,
    objTenantRepository: clsTenantRepository,
    objMasterService: clsMasterService,
    intCurrentLanguageID: int | None = None,
) -> tuple[int, int, str]:
    objTenant = objTenantRepository.getTenantByID(intTenantID)
    if not objTenant:
        raise AppException("Tenant configuration not found.", 404)

    intDefaultLanguageID = int(objTenant.intDefaultLanguageID or 1)
    intSecondaryLanguageID = (
        int(objTenant.intSecondaryLanguageID)
        if objTenant.intSecondaryLanguageID is not None
        else None
    )
    if intSecondaryLanguageID is None:
        raise AppException("Tenant secondary language is not configured.", 400)

    intResolvedCurrentLanguageID = (
        intCurrentLanguageID or objPayload.intSourceLanguageID or intDefaultLanguageID
    )
    if intResolvedCurrentLanguageID == intSecondaryLanguageID:
        intSourceLanguageID = intSecondaryLanguageID
        intTargetLanguageID = intDefaultLanguageID
    else:
        intSourceLanguageID = intDefaultLanguageID
        intTargetLanguageID = intSecondaryLanguageID

    dicResult = await objMasterService.translateText(
        objPayload,
        intSourceLanguageID=intSourceLanguageID,
        intTargetLanguageID=intTargetLanguageID,
    )
    return (
        intSourceLanguageID,
        intTargetLanguageID,
        dicResult["strTranslatedText"],
    )


def normalizeActionCode(strActionCode: str) -> str:
    return strActionCode.strip().lower()


def normalizeModuleCode(strModuleCode: str) -> str:
    return strModuleCode.strip().upper().replace("-", "_").replace(" ", "_")


def ensureDepartmentActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplDepartmentModuleCodes,
        "Department",
    )


def ensureModuleActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
    tplModuleCodes: tuple[str, ...],
    strModuleLabel: str,
) -> None:
    intUserID = getRequestUserID(objRequest)
    if not intUserID:
        raise UnauthorizedException("Authentication context is missing or invalid.")

    intTenantID, intCompanyID = getRequestContext(objRequest)
    objRights = objAuthorizationContextService.getActionRightsForUser(
        intUserID=intUserID,
        intTenantID=intTenantID,
        intCompanyID=intCompanyID,
    )
    dicAllowedActions = {
        normalizeModuleCode(strModuleCode): {
            normalizeActionCode(strAllowedAction)
            for strAllowedAction in lstAllowedActions
        }
        for strModuleCode, lstAllowedActions in objRights.dicAllowedActions.items()
    }
    strNormalizedAction = normalizeActionCode(strActionCode)
    for strModuleCode in tplModuleCodes:
        if strNormalizedAction in dicAllowedActions.get(normalizeModuleCode(strModuleCode), set()):
            return
    raise ForbiddenException(
        f"{strModuleLabel} {strNormalizedAction} access is not available for your user group."
    )


def ensureSalaryComponentActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplSalaryComponentModuleCodes,
        "Salary component",
    )


def ensureEssDeclarationActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplEssDeclarationModuleCodes,
        "ESS declaration",
    )


def ensureSalaryStructureActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplSalaryStructureModuleCodes,
        "Salary structure",
    )


def ensurePayrollCycleActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplPayrollCycleModuleCodes,
        "Payroll cycle",
    )


def ensureTaxRegimeActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplTaxRegimeModuleCodes,
        "Tax regime",
    )


def ensurePayrollProcessLogActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplPayrollProcessLogModuleCodes,
        "Payroll process log",
    )


def ensureVersionLogActionAllowed(
    objRequest: Request,
    strActionCode: str,
    objAuthorizationContextService: clsAuthorizationContextService,
) -> None:
    ensureModuleActionAllowed(
        objRequest,
        strActionCode,
        objAuthorizationContextService,
        tplVersionLogModuleCodes,
        "Version log",
    )


def parseStatus(strStatus: str | None) -> bool | None:
    # UI filters send human-readable status strings; repository filters use booleans.
    if strStatus is None or not strStatus.strip():
        return None
    if strStatus.lower() == "active":
        return True
    if strStatus.lower() == "inactive":
        return False
    return None


def parseEmploymentStatus(strStatus: str | None) -> str | None:
    if strStatus is None or not strStatus.strip():
        return None
    strNormalizedStatus = strStatus.strip().title()
    if strNormalizedStatus in {"Active", "Inactive"}:
        return strNormalizedStatus
    return None


@objRouter.get("/departments")
async def listDepartments(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Returns the scoped department list used to populate the department master grid.
    try:
        ensureDepartmentActionAllowed(objRequest, "view", objAuthorizationContextService)
        intTenantID, intCompanyID = getRequestContext(objRequest)
        try:
            lstRecords = await objMasterService.listDepartments(
                intTenantID,
                intCompanyID,
                strSearchName,
                strSearchCode,
                parseStatus(strStatus),
                intLanguageID or getRequestLanguageID(objRequest),
            )
        except Exception:
            objLogger.exception(
                "Department list localized fetch failed for tenant=%s company=%s. Retrying with base department values.",
                intTenantID,
                intCompanyID,
            )
            lstRecords = await objMasterService.listDepartments(
                intTenantID,
                intCompanyID,
                strSearchName,
                strSearchCode,
                parseStatus(strStatus),
                None,
            )
        return buildResponse(True, "Department list fetched successfully.", lstRecords)
    except Exception:
        objLogger.exception(
            "Department list route failed. Returning empty list fallback to keep the grid usable."
        )
        return buildResponse(True, "Department list fetched successfully.", [])


@objRouter.get("/departments/form-options")
async def getDepartmentFormOptions(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureDepartmentActionAllowed(objRequest, "view", objAuthorizationContextService)
    dicOptions = await objMasterService.getDepartmentFormOptions()
    return buildResponse(
        True,
        "Department form options fetched successfully.",
        dicOptions,
    )


@objRouter.post("/departments/translate")
async def translateDepartmentText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    ensureDepartmentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    objTenant = objTenantRepository.getTenantByID(intTenantID)
    if not objTenant:
        raise AppException("Tenant configuration not found.", 404)

    intDefaultLanguageID = int(objTenant.intDefaultLanguageID or 1)
    intSecondaryLanguageID = (
        int(objTenant.intSecondaryLanguageID)
        if objTenant.intSecondaryLanguageID is not None
        else None
    )
    if intSecondaryLanguageID is None:
        raise AppException("Tenant secondary language is not configured.", 400)

    intCurrentLanguageID = (
        getRequestLanguageID(objRequest)
        or objPayload.intSourceLanguageID
        or intDefaultLanguageID
    )
    if intCurrentLanguageID == intSecondaryLanguageID:
        intSourceLanguageID = intSecondaryLanguageID
        intTargetLanguageID = intDefaultLanguageID
    else:
        intSourceLanguageID = intDefaultLanguageID
        intTargetLanguageID = intSecondaryLanguageID

    dicResult = await objMasterService.translateText(
        objPayload,
        intSourceLanguageID=intSourceLanguageID,
        intTargetLanguageID=intTargetLanguageID,
    )
    return buildResponse(True, "Department text translated successfully.", dicResult)


@objRouter.post("/translate")
async def translateMasterText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    objTenant = objTenantRepository.getTenantByID(intTenantID)
    if not objTenant:
        raise AppException("Tenant configuration not found.", 404)

    intDefaultLanguageID = int(objTenant.intDefaultLanguageID or 1)
    intSecondaryLanguageID = (
        int(objTenant.intSecondaryLanguageID)
        if objTenant.intSecondaryLanguageID is not None
        else None
    )
    if intSecondaryLanguageID is None:
        raise AppException("Tenant secondary language is not configured.", 400)

    intCurrentLanguageID = (
        getRequestLanguageID(objRequest)
        or objPayload.intSourceLanguageID
        or intDefaultLanguageID
    )
    if intCurrentLanguageID == intSecondaryLanguageID:
        intSourceLanguageID = intSecondaryLanguageID
        intTargetLanguageID = intDefaultLanguageID
    else:
        intSourceLanguageID = intDefaultLanguageID
        intTargetLanguageID = intSecondaryLanguageID

    dicResult = await objMasterService.translateText(
        objPayload,
        intSourceLanguageID=intSourceLanguageID,
        intTargetLanguageID=intTargetLanguageID,
    )
    return buildResponse(True, "Master text translated successfully.", dicResult)


@objRouter.post("/departments/detail")
async def getDepartmentDetail(
    objRequest: Request,
    objPayload: clsLocalizedRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Returns one department record for view/edit flows.
    ensureDepartmentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getDepartment(
        objPayload.intID,
        intTenantID,
        intCompanyID,
        objPayload.intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Department fetched successfully.", dicRecord)


@objRouter.post("/departments", status_code=status.HTTP_201_CREATED)
async def createDepartment(
    objRequest: Request,
    objPayload: clsDepartmentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Creates a department inside the caller's tenant/company scope.
    ensureDepartmentActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createDepartment(
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Department saved successfully.", dicRecord)


@objRouter.put("/departments/{intDepartmentID}")
async def updateDepartment(
    intDepartmentID: int,
    objRequest: Request,
    objPayload: clsDepartmentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Updates a single scoped department record.
    ensureDepartmentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateDepartment(
        intDepartmentID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Department updated successfully.", dicRecord)


@objRouter.post("/departments/bulk-status")
async def bulkDepartmentStatus(
    objRequest: Request,
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Applies one status change to multiple department records.
    ensureDepartmentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkDepartmentStatus(
        objPayload.lstIDs, objPayload.blnIsActive, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Department status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/departments/bulk-delete")
async def bulkDepartmentDelete(
    objRequest: Request,
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    # Deletes multiple department records in one request.
    ensureDepartmentActionAllowed(objRequest, "delete", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkDepartmentDelete(
        objPayload.lstIDs, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Department records deleted successfully.", {"blnSuccess": True}
    )


@objRouter.get("/designations")
async def listDesignations(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Returns the designation list used by the designation master grid.
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listDesignations(
        intTenantID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Designation list fetched successfully.", lstRecords)


@objRouter.get("/designations/form-options")
async def getDesignationFormOptions(
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getDesignationFormOptions()
    return buildResponse(True, "Designation form options fetched successfully.", dicOptions)


@objRouter.post("/designations/translate")
async def translateDesignationText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    objTenant = objTenantRepository.getTenantByID(intTenantID)
    if not objTenant:
        raise AppException("Tenant configuration not found.", 404)

    intDefaultLanguageID = int(objTenant.intDefaultLanguageID or 1)
    intSecondaryLanguageID = (
        int(objTenant.intSecondaryLanguageID)
        if objTenant.intSecondaryLanguageID is not None
        else None
    )
    if intSecondaryLanguageID is None:
        raise AppException("Tenant secondary language is not configured.", 400)

    intCurrentLanguageID = (
        getRequestLanguageID(objRequest)
        or objPayload.intSourceLanguageID
        or intDefaultLanguageID
    )
    if intCurrentLanguageID == intSecondaryLanguageID:
        intSourceLanguageID = intSecondaryLanguageID
        intTargetLanguageID = intDefaultLanguageID
    else:
        intSourceLanguageID = intDefaultLanguageID
        intTargetLanguageID = intSecondaryLanguageID

    dicResult = await objMasterService.translateText(
        objPayload,
        intSourceLanguageID=intSourceLanguageID,
        intTargetLanguageID=intTargetLanguageID,
    )
    return buildResponse(True, "Designation text translated successfully.", dicResult)


@objRouter.get("/designations/{intDesignationID}")
async def getDesignation(
    intDesignationID: int,
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Returns one designation record for view/edit flows.
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getDesignation(
        intDesignationID,
        intTenantID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Designation fetched successfully.", dicRecord)


@objRouter.post("/designations", status_code=status.HTTP_201_CREATED)
async def createDesignation(
    objRequest: Request,
    objPayload: clsDesignationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Creates a designation within the caller's tenant scope.
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createDesignation(
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Designation saved successfully.", dicRecord)


@objRouter.put("/designations/{intDesignationID}")
async def updateDesignation(
    intDesignationID: int,
    objRequest: Request,
    objPayload: clsDesignationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Updates a single designation record.
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateDesignation(
        intDesignationID,
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Designation updated successfully.", dicRecord)


@objRouter.post("/designations/bulk-status")
async def bulkDesignationStatus(
    objRequest: Request,
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Applies one status change to multiple designation records.
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkDesignationStatus(
        objPayload.lstIDs, objPayload.blnIsActive, intTenantID
    )
    return buildResponse(
        True, "Designation status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/designations/bulk-delete")
async def bulkDesignationDelete(
    objRequest: Request,
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Deletes multiple designation records in one request.
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkDesignationDelete(objPayload.lstIDs, intTenantID)
    return buildResponse(
        True, "Designation records deleted successfully.", {"blnSuccess": True}
    )


@objRouter.get("/banks")
async def listBanks(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listBanks(
        intTenantID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Bank list fetched successfully.", lstRecords)


@objRouter.get("/banks/form-options")
async def getBankFormOptions(
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getBankFormOptions()
    return buildResponse(True, "Bank form options fetched successfully.", dicOptions)


@objRouter.post("/banks/translate")
async def translateBankText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        intCurrentLanguageID=getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "Bank translation generated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )


@objRouter.get("/banks/{intBankID}")
async def getBank(
    intBankID: int,
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getBank(
        intBankID,
        intTenantID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Bank fetched successfully.", dicRecord)


@objRouter.post("/banks", status_code=status.HTTP_201_CREATED)
async def createBank(objRequest: Request, objPayload: clsBankRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createBank(
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Bank saved successfully.", dicRecord)


@objRouter.put("/banks/{intBankID}")
async def updateBank(intBankID: int, objRequest: Request, objPayload: clsBankRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateBank(
        intBankID,
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Bank updated successfully.", dicRecord)


@objRouter.post("/banks/bulk-status")
async def bulkBankStatus(objRequest: Request, objPayload: clsBulkStatusRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkBankStatus(objPayload.lstIDs, objPayload.blnIsActive, intTenantID)
    return buildResponse(True, "Bank status updated successfully.", {"blnSuccess": True})


@objRouter.post("/banks/bulk-delete")
async def bulkBankDelete(objRequest: Request, objPayload: clsBulkDeleteRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkBankDelete(objPayload.lstIDs, intTenantID)
    return buildResponse(True, "Bank records deleted successfully.", {"blnSuccess": True})


@objRouter.get("/cost-centers")
async def listCostCenters(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listCostCenters(
        intTenantID,
        intCompanyID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Cost center list fetched successfully.", lstRecords)


@objRouter.get("/cost-centers/form-options")
async def getCostCenterFormOptions(
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getCostCenterFormOptions()
    return buildResponse(True, "Cost center form options fetched successfully.", dicOptions)


@objRouter.post("/cost-centers/translate")
async def translateCostCenterText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        intCurrentLanguageID=getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "Cost center translation generated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )


@objRouter.get("/cost-centers/{intCostCenterID}")
async def getCostCenter(
    intCostCenterID: int,
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getCostCenter(
        intCostCenterID,
        intTenantID,
        intCompanyID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Cost center fetched successfully.", dicRecord)


@objRouter.post("/cost-centers", status_code=status.HTTP_201_CREATED)
async def createCostCenter(objRequest: Request, objPayload: clsCostCenterRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createCostCenter(
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Cost center saved successfully.", dicRecord)


@objRouter.put("/cost-centers/{intCostCenterID}")
async def updateCostCenter(intCostCenterID: int, objRequest: Request, objPayload: clsCostCenterRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateCostCenter(
        intCostCenterID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Cost center updated successfully.", dicRecord)


@objRouter.post("/cost-centers/bulk-status")
async def bulkCostCenterStatus(objRequest: Request, objPayload: clsBulkStatusRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkCostCenterStatus(objPayload.lstIDs, objPayload.blnIsActive, intTenantID, intCompanyID)
    return buildResponse(True, "Cost center status updated successfully.", {"blnSuccess": True})


@objRouter.post("/cost-centers/bulk-delete")
async def bulkCostCenterDelete(objRequest: Request, objPayload: clsBulkDeleteRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkCostCenterDelete(objPayload.lstIDs, intTenantID, intCompanyID)
    return buildResponse(True, "Cost center records deleted successfully.", {"blnSuccess": True})


@objRouter.get("/users")
async def listUsers(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Returns the tenant-scoped user list used to populate the user master grid.
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listUsers(
        intTenantID, strSearchName, strSearchCode, parseStatus(strStatus)
    )
    return buildResponse(True, "User list fetched successfully.", lstRecords)


@objRouter.get("/users/form-options")
async def getUserFormOptions(
    objRequest: Request,
    intUserID: int | None = Query(default=None, alias="user_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicOptions = await objMasterService.getUserFormOptions(
        intTenantID,
        intCompanyID,
        intUserID,
    )
    return buildResponse(True, "User form options fetched successfully.", dicOptions)


@objRouter.get("/users/{intUserID}")
async def getUser(
    intUserID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Returns one user record for user-master view/edit dialogs.
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getUser(intUserID, intTenantID)
    return buildResponse(True, "User fetched successfully.", dicRecord)


@objRouter.post("/users", status_code=status.HTTP_201_CREATED)
async def createUser(
    objRequest: Request,
    objPayload: clsUserRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Creates a user inside the caller's tenant scope.
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createUser(objPayload, intTenantID, intCompanyID)
    return buildResponse(True, "User saved successfully.", dicRecord)


@objRouter.put("/users/{intUserID}")
async def updateUser(
    intUserID: int,
    objRequest: Request,
    objPayload: clsUserRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Updates a single scoped user record.
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateUser(intUserID, objPayload, intTenantID)
    return buildResponse(True, "User updated successfully.", dicRecord)


@objRouter.post("/users/bulk-status")
async def bulkUserStatus(
    objRequest: Request,
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Applies one status change to multiple user records.
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkUserStatus(
        objPayload.lstIDs, objPayload.blnIsActive, intTenantID
    )
    return buildResponse(
        True, "User status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/users/bulk-delete")
async def bulkUserDelete(
    objRequest: Request,
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    # Deletes multiple user records in one request.
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkUserDelete(objPayload.lstIDs, intTenantID)
    return buildResponse(
        True, "User records deleted successfully.", {"blnSuccess": True}
    )


@objRouter.get("/employee")
async def listEmployees(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEmployees(
        intTenantID,
        intCompanyID,
        strSearchName,
        strSearchCode,
        parseEmploymentStatus(strStatus),
    )
    return buildResponse(True, "Employee list fetched successfully.", lstRecords)


@objRouter.get("/employee/form-options")
async def getEmployeeFormOptions(
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicOptions = await objMasterService.getEmployeeFormOptions(
        intTenantID,
        intCompanyID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True, "Employee form options fetched successfully.", dicOptions
    )


@objRouter.post("/employee/detail")
async def getEmployeeDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getEmployee(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Employee fetched successfully.", dicRecord)


@objRouter.post("/employee", status_code=status.HTTP_201_CREATED)
async def createEmployee(
    objRequest: Request,
    objPayload: clsEmployeeRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createEmployee(
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee saved successfully.", dicRecord)


@objRouter.put("/employee/{intEmployeeID}")
async def updateEmployee(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateEmployee(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee updated successfully.", dicRecord)


@objRouter.post("/employee/bulk-status")
async def bulkEmployeeStatus(
    objRequest: Request,
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkEmployeeStatus(
        objPayload.lstIDs,
        "Active" if objPayload.blnIsActive else "Inactive",
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/employee/bulk-delete")
async def bulkEmployeeDelete(
    objRequest: Request,
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkEmployeeDelete(
        objPayload.lstIDs,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee records deactivated successfully.", {"blnSuccess": True}
    )


@objRouter.get("/countries")
async def listCountries(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    lstRecords = await objMasterService.listCountries(
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Country list fetched successfully.", lstRecords)


@objRouter.get("/countries/form-options")
async def getCountryFormOptions(
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getCountryFormOptions()
    return buildResponse(True, "Country form options fetched successfully.", dicOptions)


@objRouter.post("/countries/translate")
async def translateCountryText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "Country text translated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )
 
 
@objRouter.get("/countries/{intCountryID}")
async def getCountry(
    objRequest: Request,
    intCountryID: int,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.getCountry(
        intCountryID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Country fetched successfully.", dicRecord)


@objRouter.post("/countries", status_code=status.HTTP_201_CREATED)
async def createCountry(
    objRequest: Request,
    objPayload: clsCountryRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.createCountry(objPayload, getRequestUserID(objRequest))
    return buildResponse(True, "Country saved successfully.", dicRecord)


@objRouter.put("/countries/{intCountryID}")
async def updateCountry(
    objRequest: Request,
    intCountryID: int,
    objPayload: clsCountryRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.updateCountry(intCountryID, objPayload, getRequestUserID(objRequest))
    return buildResponse(True, "Country updated successfully.", dicRecord)


@objRouter.post("/countries/bulk-status")
async def bulkCountryStatus(
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    await objMasterService.bulkCountryStatus(objPayload.lstIDs, objPayload.blnIsActive)
    return buildResponse(
        True, "Country status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/countries/bulk-delete")
async def bulkCountryDelete(
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    await objMasterService.bulkCountryDelete(objPayload.lstIDs)
    return buildResponse(
        True, "Country records deleted successfully.", {"blnSuccess": True}
    )


@objRouter.get("/states")
async def listStates(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    lstRecords = await objMasterService.listStates(
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "State list fetched successfully.", lstRecords)


@objRouter.get("/states/form-options")
async def getStateFormOptions(
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getStateFormOptions(
        intLanguageID or getRequestLanguageID(objRequest)
    )
    return buildResponse(True, "State form options fetched successfully.", dicOptions)


@objRouter.post("/states/translate")
async def translateStateText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "State text translated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )


@objRouter.get("/states/{intStateID}")
async def getState(
    objRequest: Request,
    intStateID: int,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.getState(
        intStateID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "State fetched successfully.", dicRecord)


@objRouter.post("/states", status_code=status.HTTP_201_CREATED)
async def createState(
    objRequest: Request,
    objPayload: clsStateRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.createState(objPayload, getRequestUserID(objRequest))
    return buildResponse(True, "State saved successfully.", dicRecord)


@objRouter.put("/states/{intStateID}")
async def updateState(
    objRequest: Request,
    intStateID: int,
    objPayload: clsStateRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicRecord = await objMasterService.updateState(intStateID, objPayload, getRequestUserID(objRequest))
    return buildResponse(True, "State updated successfully.", dicRecord)


@objRouter.post("/states/bulk-status")
async def bulkStateStatus(
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    await objMasterService.bulkStateStatus(objPayload.lstIDs, objPayload.blnIsActive)
    return buildResponse(
        True, "State status updated successfully.", {"blnSuccess": True}
    )


@objRouter.post("/states/bulk-delete")
async def bulkStateDelete(
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    await objMasterService.bulkStateDelete(objPayload.lstIDs)
    return buildResponse(
        True, "State records deleted successfully.", {"blnSuccess": True}
    )


@objRouter.get("/grades")
async def listGrades(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listGrades(
        intTenantID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Grade list fetched successfully.", lstRecords)


@objRouter.get("/grades/form-options")
async def getGradeFormOptions(
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    dicOptions = await objMasterService.getGradeFormOptions()
    return buildResponse(True, "Grade form options fetched successfully.", dicOptions)


@objRouter.post("/grades/translate")
async def translateGradeText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        intCurrentLanguageID=getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "Grade translation generated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )


@objRouter.get("/grades/{intGradeID}")
async def getGrade(
    intGradeID: int,
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getGrade(
        intGradeID,
        intTenantID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Grade fetched successfully.", dicRecord)


@objRouter.post("/grades", status_code=status.HTTP_201_CREATED)
async def createGrade(objRequest: Request, objPayload: clsGradeRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createGrade(
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Grade saved successfully.", dicRecord)


@objRouter.put("/grades/{intGradeID}")
async def updateGrade(intGradeID: int, objRequest: Request, objPayload: clsGradeRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateGrade(
        intGradeID,
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Grade updated successfully.", dicRecord)


@objRouter.post("/grades/bulk-status")
async def bulkGradeStatus(objRequest: Request, objPayload: clsBulkStatusRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkGradeStatus(objPayload.lstIDs, objPayload.blnIsActive, intTenantID)
    return buildResponse(True, "Grade status updated successfully.", {"blnSuccess": True})


@objRouter.post("/grades/bulk-delete")
async def bulkGradeDelete(objRequest: Request, objPayload: clsBulkDeleteRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkGradeDelete(objPayload.lstIDs, intTenantID)
    return buildResponse(True, "Grade records deleted successfully.", {"blnSuccess": True})


@objRouter.get("/locations")
async def listLocations(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listLocations(
        intTenantID,
        intCompanyID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Location list fetched successfully.", lstRecords)


@objRouter.get("/locations/form-options")
async def getLocationFormOptions(objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    dicOptions = await objMasterService.getLocationFormOptions()
    return buildResponse(True, "Location form options fetched successfully.", dicOptions)


@objRouter.post("/locations/translate")
async def translateLocationText(
    objRequest: Request,
    objPayload: clsTranslationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objTenantRepository: clsTenantRepository = Depends(getTenantRepository),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    intSourceLanguageID, intTargetLanguageID, strTranslatedText = await resolveTranslationRequest(
        intTenantID,
        objPayload,
        objTenantRepository,
        objMasterService,
        intCurrentLanguageID=getRequestLanguageID(objRequest),
    )
    return buildResponse(
        True,
        "Location translation generated successfully.",
        {
            "strTranslatedText": strTranslatedText,
            "intSourceLanguageID": intSourceLanguageID,
            "intTargetLanguageID": intTargetLanguageID,
        },
    )


@objRouter.get("/locations/{intLocationID}")
async def getLocation(
    intLocationID: int,
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getLocation(
        intLocationID,
        intTenantID,
        intCompanyID,
        intLanguageID or getRequestLanguageID(objRequest),
    )
    return buildResponse(True, "Location fetched successfully.", dicRecord)


@objRouter.post("/locations", status_code=status.HTTP_201_CREATED)
async def createLocation(objRequest: Request, objPayload: clsLocationRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createLocation(
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Location saved successfully.", dicRecord)


@objRouter.put("/locations/{intLocationID}")
async def updateLocation(intLocationID: int, objRequest: Request, objPayload: clsLocationRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateLocation(
        intLocationID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Location updated successfully.", dicRecord)


@objRouter.post("/locations/bulk-status")
async def bulkLocationStatus(objRequest: Request, objPayload: clsBulkStatusRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkLocationStatus(objPayload.lstIDs, objPayload.blnIsActive, intTenantID, intCompanyID)
    return buildResponse(True, "Location status updated successfully.", {"blnSuccess": True})


@objRouter.post("/locations/bulk-delete")
async def bulkLocationDelete(objRequest: Request, objPayload: clsBulkDeleteRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.bulkLocationDelete(objPayload.lstIDs, intTenantID, intCompanyID)
    return buildResponse(True, "Location records deleted successfully.", {"blnSuccess": True})


@objRouter.get("/ess-declaration-categories")
async def listEssDeclarationCategories(
    objRequest: Request,
    intLanguageID: int | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureEssDeclarationActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEssDeclarationCategories(
        intTenantID,
        intCompanyID,
        intLanguageID,
    )
    return buildResponse(
        True,
        "ESS declaration category list fetched successfully.",
        lstRecords,
    )


@objRouter.get("/salary-components")
async def listSalaryComponents(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    intLanguageID: int | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listSalaryComponents(
        intTenantID,
        strSearchName,
        strSearchCode,
        parseStatus(strStatus),
        intLanguageID,
    )
    return buildResponse(True, "Salary component list fetched successfully.", lstRecords)


@objRouter.get("/salary-components/form-options")
async def getSalaryComponentFormOptionsLegacy(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicOptions = await objMasterService.getSalaryComponentFormOptions(intTenantID)
    return buildResponse(
        True,
        "Salary component form options fetched successfully.",
        dicOptions,
    )


@objRouter.get("/salary-component-form-options")
async def getSalaryComponentFormOptionsAlias(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicOptions = await objMasterService.getSalaryComponentFormOptions(intTenantID)
    return buildResponse(
        True,
        "Salary component form options fetched successfully.",
        dicOptions,
    )


@objRouter.post("/salary-components/detail")
async def getSalaryComponentDetail(
    objRequest: Request,
    objPayload: clsLocalizedRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getSalaryComponent(
        objPayload.intID, intTenantID, objPayload.intLanguageID
    )
    return buildResponse(True, "Salary component fetched successfully.", dicRecord)


@objRouter.post("/salary-components", status_code=status.HTTP_201_CREATED)
async def createSalaryComponent(
    objRequest: Request,
    objPayload: clsSalaryComponentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createSalaryComponent(
        objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Salary component saved successfully.", dicRecord)


@objRouter.put("/salary-components/{intSalaryComponentID}")
async def updateSalaryComponent(
    intSalaryComponentID: int,
    objRequest: Request,
    objPayload: clsSalaryComponentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateSalaryComponent(
        intSalaryComponentID,
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Salary component updated successfully.", dicRecord)


@objRouter.post("/salary-components/bulk-status")
async def bulkSalaryComponentStatus(
    objRequest: Request,
    objPayload: clsBulkStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkSalaryComponentStatus(
        objPayload.lstIDs, objPayload.blnIsActive, intTenantID
    )
    return buildResponse(True, "Salary component status updated successfully.", {"blnSuccess": True})


@objRouter.post("/salary-components/bulk-delete")
async def bulkSalaryComponentDelete(
    objRequest: Request,
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "delete", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.bulkSalaryComponentDelete(objPayload.lstIDs, intTenantID)
    return buildResponse(True, "Salary component records deleted successfully.", {"blnSuccess": True})


@objRouter.post("/employee/address/detail")
async def getEmployeeAddressDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getEmployeeAddress(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Employee address fetched successfully.", dicRecord)


@objRouter.put("/employee/{intEmployeeID}/address")
async def saveEmployeeAddress(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeAddressRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.saveEmployeeAddress(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee address saved successfully.", dicRecord)


@objRouter.post("/employee/bank/detail")
async def getEmployeeBankAccountDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getEmployeeBankAccount(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Employee bank details fetched successfully.", dicRecord)


@objRouter.put("/employee/{intEmployeeID}/bank")
async def saveEmployeeBankAccount(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeBankAccountRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.saveEmployeeBankAccount(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee bank details saved successfully.", dicRecord)


@objRouter.post("/employee/statutory/detail")
async def getEmployeeStatutoryDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getEmployeeStatutory(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Employee statutory details fetched successfully.", dicRecord
    )


@objRouter.put("/employee/{intEmployeeID}/statutory")
async def saveEmployeeStatutory(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeStatutoryRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.saveEmployeeStatutory(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee statutory details saved successfully.", dicRecord
    )


@objRouter.get("/employee/{intEmployeeID}/experiences")
async def listEmployeeExperiences(
    intEmployeeID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEmployeeExperiences(
        intEmployeeID, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Employee experience details fetched successfully.", lstRecords
    )


@objRouter.post("/employee/{intEmployeeID}/experiences")
async def createEmployeeExperience(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeExperienceRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createEmployeeExperience(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee experience saved successfully.", dicRecord)


@objRouter.put("/employee/{intEmployeeID}/experiences/{intExperienceID}")
async def updateEmployeeExperience(
    intEmployeeID: int,
    intExperienceID: int,
    objRequest: Request,
    objPayload: clsEmployeeExperienceRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateEmployeeExperience(
        intEmployeeID,
        intExperienceID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee experience updated successfully.", dicRecord)


@objRouter.delete("/employee/{intEmployeeID}/experiences/{intExperienceID}")
async def deleteEmployeeExperience(
    intEmployeeID: int,
    intExperienceID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.deleteEmployeeExperience(
        intEmployeeID,
        intExperienceID,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee experience deleted successfully.", dicRecord)


@objRouter.get("/employee/{intEmployeeID}/qualifications")
async def listEmployeeQualifications(
    intEmployeeID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEmployeeQualifications(
        intEmployeeID, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Employee qualification details fetched successfully.", lstRecords
    )


@objRouter.post("/employee/{intEmployeeID}/qualifications")
async def createEmployeeQualification(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeQualificationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createEmployeeQualification(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee qualification saved successfully.", dicRecord
    )


@objRouter.put("/employee/{intEmployeeID}/qualifications/{intQualificationID}")
async def updateEmployeeQualification(
    intEmployeeID: int,
    intQualificationID: int,
    objRequest: Request,
    objPayload: clsEmployeeQualificationRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateEmployeeQualification(
        intEmployeeID,
        intQualificationID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee qualification updated successfully.", dicRecord
    )


@objRouter.delete("/employee/{intEmployeeID}/qualifications/{intQualificationID}")
async def deleteEmployeeQualification(
    intEmployeeID: int,
    intQualificationID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.deleteEmployeeQualification(
        intEmployeeID,
        intQualificationID,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Employee qualification deleted successfully.", dicRecord
    )


@objRouter.get("/employee/{intEmployeeID}/family")
async def listEmployeeFamilyDetails(
    intEmployeeID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEmployeeFamilyDetails(
        intEmployeeID, intTenantID, intCompanyID
    )
    return buildResponse(
        True, "Employee family details fetched successfully.", lstRecords
    )


@objRouter.post("/employee/{intEmployeeID}/family")
async def createEmployeeFamilyDetail(
    intEmployeeID: int,
    objRequest: Request,
    objPayload: clsEmployeeFamilyDetailRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createEmployeeFamilyDetail(
        intEmployeeID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee family detail saved successfully.", dicRecord)


@objRouter.put("/family/{intFamilyID}")
async def updateEmployeeFamilyDetail(
    intFamilyID: int,
    objRequest: Request,
    objPayload: clsEmployeeFamilyDetailRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateEmployeeFamilyDetail(
        intFamilyID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Employee family detail updated successfully.", dicRecord)


@objRouter.delete("/family/{intFamilyID}")
async def deleteEmployeeFamilyDetail(
    intFamilyID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.deleteEmployeeFamilyDetail(
        intFamilyID,
        intTenantID,
        intCompanyID,
    )
    return buildResponse(True, "Employee family detail deleted successfully.", None)

@objRouter.get("/ess-declaration-categories")
async def listEssDeclarationCategories(
    objRequest: Request,
    intLanguageID: int | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureEssDeclarationActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listEssDeclarationCategories(
        intTenantID,
        intCompanyID,
        intLanguageID,
    )
    return buildResponse(
        True,
        "ESS declaration category list fetched successfully.",
        lstRecords,
    )


@objRouter.get("/salary-components")
async def listSalaryComponents(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    return buildResponse(
        True,
        "Salary components fetched successfully.",
        await objMasterService.listSalaryComponents(intTenantID),
    )


@objRouter.get("/salary-components/form-options")
async def getSalaryComponentFormOptions(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicOptions = await objMasterService.getSalaryComponentFormOptions(intTenantID)
    return buildResponse(
        True,
        "Salary component form options fetched successfully.",
        dicOptions,
    )


@objRouter.post("/salary-components", status_code=status.HTTP_201_CREATED)
async def createSalaryComponent(
    objRequest: Request,
    objPayload: clsSalaryComponentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createSalaryComponent(
        objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Salary component created successfully.", dicRecord)


@objRouter.put("/salary-components/{intSalaryComponentID}")
async def updateSalaryComponent(
    intSalaryComponentID: int,
    objRequest: Request,
    objPayload: clsSalaryComponentRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateSalaryComponent(
        intSalaryComponentID, objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Salary component updated successfully.", dicRecord)


@objRouter.post("/salary-components/{intSalaryComponentID}/status")
async def setSalaryComponentStatus(
    intSalaryComponentID: int,
    objRequest: Request,
    objPayload: clsSalaryComponentStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.setSalaryComponentStatus(
        intSalaryComponentID,
        objPayload,
        intTenantID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Salary component status updated successfully.", dicRecord
    )


@objRouter.delete("/salary-components/{intSalaryComponentID}")
async def deleteSalaryComponent(
    intSalaryComponentID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryComponentActionAllowed(objRequest, "delete", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    await objMasterService.deleteSalaryComponent(intSalaryComponentID, intTenantID)
    return buildResponse(True, "Salary component deleted successfully.", {"blnSuccess": True})


@objRouter.get("/payroll-cycles")
async def listPayrollCycles(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listPayrollCycles(
        intTenantID, intCompanyID, strSearchName, strSearchCode, parseStatus(strStatus)
    )
    return buildResponse(True, "Payroll cycles fetched successfully.", lstRecords)


@objRouter.get("/payroll-process-logs")
async def listPayrollProcessLogs(
    objRequest: Request,
    intPayrollRunID: int | None = Query(default=None),
    intEmployeeID: int | None = Query(default=None),
    strProcessStage: str | None = Query(default=None),
    strProcessStatus: str | None = Query(default=None),
    strSearchText: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollProcessLogActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listPayrollProcessLogs(
        intTenantID,
        intCompanyID,
        intPayrollRunID,
        intEmployeeID,
        strProcessStage,
        strProcessStatus,
        strSearchText,
    )
    return buildResponse(True, "Payroll process logs fetched successfully.", lstRecords)


@objRouter.get("/payroll-process-logs/form-options")
async def getPayrollProcessLogFormOptions(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollProcessLogActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicOptions = await objMasterService.getPayrollProcessLogFormOptions(
        intTenantID, intCompanyID
    )
    return buildResponse(
        True,
        "Payroll process log form options fetched successfully.",
        dicOptions,
    )


@objRouter.get("/payroll-cycles/form-options")
async def getPayrollCycleFormOptions(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicOptions = await objMasterService.getPayrollCycleFormOptions(
        intTenantID, intCompanyID
    )
    return buildResponse(
        True,
        "Payroll cycle form options fetched successfully.",
        dicOptions,
    )


@objRouter.post("/payroll-cycles/detail")
async def getPayrollCycleDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getPayrollCycle(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Payroll cycle fetched successfully.", dicRecord)


@objRouter.post("/payroll-cycles", status_code=status.HTTP_201_CREATED)
async def createPayrollCycle(
    objRequest: Request,
    objPayload: clsPayrollCycleRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createPayrollCycle(
        objPayload, intTenantID, intCompanyID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Payroll cycle created successfully.", dicRecord)


@objRouter.put("/payroll-cycles/{intPayrollCycleID}")
async def updatePayrollCycle(
    intPayrollCycleID: int,
    objRequest: Request,
    objPayload: clsPayrollCycleRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updatePayrollCycle(
        intPayrollCycleID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Payroll cycle updated successfully.", dicRecord)


@objRouter.post("/payroll-cycles/{intPayrollCycleID}/status")
async def setPayrollCycleStatus(
    intPayrollCycleID: int,
    objRequest: Request,
    objPayload: clsPayrollCycleStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensurePayrollCycleActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.setPayrollCycleStatus(
        intPayrollCycleID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Payroll cycle status updated successfully.", dicRecord
    )


@objRouter.get("/tax-regimes")
async def listTaxRegimes(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listTaxRegimes(
        intTenantID, strSearchName, strSearchCode, parseStatus(strStatus)
    )
    return buildResponse(True, "Tax regimes fetched successfully.", lstRecords)


@objRouter.get("/tax-regimes/form-options")
async def getTaxRegimeFormOptions(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicOptions = await objMasterService.getTaxRegimeFormOptions(intTenantID)
    return buildResponse(True, "Tax regime form options fetched successfully.", dicOptions)


@objRouter.post("/tax-regimes/detail")
async def getTaxRegimeDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getTaxRegime(objPayload.intID, intTenantID)
    return buildResponse(True, "Tax regime fetched successfully.", dicRecord)


@objRouter.post("/tax-regimes", status_code=status.HTTP_201_CREATED)
async def createTaxRegime(
    objRequest: Request,
    objPayload: clsTaxRegimeRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createTaxRegime(
        objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Tax regime created successfully.", dicRecord)


@objRouter.put("/tax-regimes/{intTaxRegimeID}")
async def updateTaxRegime(
    intTaxRegimeID: int,
    objRequest: Request,
    objPayload: clsTaxRegimeRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateTaxRegime(
        intTaxRegimeID, objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Tax regime updated successfully.", dicRecord)


@objRouter.post("/tax-regimes/{intTaxRegimeID}/status")
async def setTaxRegimeStatus(
    intTaxRegimeID: int,
    objRequest: Request,
    objPayload: clsTaxRegimeStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.setTaxRegimeStatus(
        intTaxRegimeID, objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Tax regime status updated successfully.", dicRecord)


@objRouter.post("/tax-regimes/slabs/detail")
async def getTaxSlabsDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.getTaxSlabs(objPayload.intID, intTenantID)
    return buildResponse(True, "Tax slabs fetched successfully.", dicRecord)


@objRouter.post("/tax-regimes/{intTaxRegimeID}/slabs")
async def saveTaxSlabs(
    intTaxRegimeID: int,
    objRequest: Request,
    objPayload: clsTaxSlabSaveRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureTaxRegimeActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.saveTaxSlabs(
        intTaxRegimeID, objPayload, intTenantID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Tax slabs saved successfully.", dicRecord)


@objRouter.get("/version-logs")
async def listVersionLogs(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureVersionLogActionAllowed(objRequest, "view", objAuthorizationContextService)
    lstRecords = await objMasterService.listVersionLogs(
        strSearchName, strSearchCode, parseStatus(strStatus)
    )
    return buildResponse(True, "Version logs fetched successfully.", lstRecords)


@objRouter.post("/version-logs/detail")
async def getVersionLogDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureVersionLogActionAllowed(objRequest, "view", objAuthorizationContextService)
    dicRecord = await objMasterService.getVersionLog(objPayload.intID)
    return buildResponse(True, "Version log fetched successfully.", dicRecord)


@objRouter.post("/version-logs", status_code=status.HTTP_201_CREATED)
async def createVersionLog(
    objRequest: Request,
    objPayload: clsVersionLogRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureVersionLogActionAllowed(objRequest, "add", objAuthorizationContextService)
    dicRecord = await objMasterService.createVersionLog(
        objPayload, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Version log created successfully.", dicRecord)


@objRouter.put("/version-logs/{intVersionLogID}")
async def updateVersionLog(
    intVersionLogID: int,
    objRequest: Request,
    objPayload: clsVersionLogRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureVersionLogActionAllowed(objRequest, "edit", objAuthorizationContextService)
    dicRecord = await objMasterService.updateVersionLog(
        intVersionLogID, objPayload, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Version log updated successfully.", dicRecord)


@objRouter.post("/version-logs/{intVersionLogID}/status")
async def setVersionLogStatus(
    intVersionLogID: int,
    objRequest: Request,
    objPayload: clsVersionLogStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureVersionLogActionAllowed(objRequest, "edit", objAuthorizationContextService)
    dicRecord = await objMasterService.setVersionLogStatus(
        intVersionLogID, objPayload, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Version log status updated successfully.", dicRecord)


@objRouter.get("/salary-structures")
async def listSalaryStructures(
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    return buildResponse(
        True,
        "Salary structures fetched successfully.",
        await objMasterService.listSalaryStructures(intTenantID, intCompanyID),
    )


@objRouter.get("/salary-structures/form-options")
async def getSalaryStructureFormOptions(
    objRequest: Request,
    intLanguageID: int | None = Query(default=None, alias="language_id"),
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicOptions = await objMasterService.getSalaryStructureFormOptions(
        intTenantID, intLanguageID
    )
    return buildResponse(
        True,
        "Salary structure form options fetched successfully.",
        dicOptions,
    )


@objRouter.post("/salary-structures/detail")
async def getSalaryStructureDetail(
    objRequest: Request,
    objPayload: clsRecordLookupRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.getSalaryStructure(
        objPayload.intID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Salary structure fetched successfully.", dicRecord)


@objRouter.post("/salary-structures", status_code=status.HTTP_201_CREATED)
async def createSalaryStructure(
    objRequest: Request,
    objPayload: clsSalaryStructureRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createSalaryStructure(
        objPayload, intTenantID, intCompanyID, getRequestUserID(objRequest)
    )
    return buildResponse(True, "Salary structure created successfully.", dicRecord)


@objRouter.post("/salary-structures/preview")
async def previewSalaryStructure(
    objRequest: Request,
    objPayload: clsSalaryStructurePreviewRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "view", objAuthorizationContextService)
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.previewSalaryStructure(
        objPayload,
        intTenantID,
    )
    return buildResponse(
        True, "Salary structure wage adjustment preview generated successfully.", dicRecord
    )


@objRouter.put("/salary-structures/{intSalaryStructureID}")
async def updateSalaryStructure(
    intSalaryStructureID: int,
    objRequest: Request,
    objPayload: clsSalaryStructureRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateSalaryStructure(
        intSalaryStructureID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Salary structure updated successfully.", dicRecord)


@objRouter.post("/salary-structures/{intSalaryStructureID}/clone", status_code=status.HTTP_201_CREATED)
async def cloneSalaryStructure(
    intSalaryStructureID: int,
    objRequest: Request,
    objPayload: clsSalaryStructureCloneRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "add", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.cloneSalaryStructure(
        intSalaryStructureID,
        objPayload,
        intTenantID,
        intCompanyID,
        getRequestUserID(objRequest),
    )
    return buildResponse(True, "Salary structure cloned successfully.", dicRecord)


@objRouter.post("/salary-structures/{intSalaryStructureID}/status")
async def setSalaryStructureStatus(
    intSalaryStructureID: int,
    objRequest: Request,
    objPayload: clsSalaryStructureStatusRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "edit", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.setSalaryStructureStatus(
        intSalaryStructureID,
        objPayload,
        intTenantID,
        intCompanyID,  
        getRequestUserID(objRequest),
    )
    return buildResponse(
        True, "Salary structure status updated successfully.", dicRecord
    )


@objRouter.delete("/salary-structures/{intSalaryStructureID}")
async def deleteSalaryStructure(
    intSalaryStructureID: int,
    objRequest: Request,
    objMasterService: clsMasterService = Depends(getMasterService),
    objAuthorizationContextService: clsAuthorizationContextService = Depends(getAuthorizationContextService),
) -> dict:
    ensureSalaryStructureActionAllowed(objRequest, "delete", objAuthorizationContextService)
    intTenantID, intCompanyID = getRequestContext(objRequest)
    await objMasterService.deleteSalaryStructure(
        intSalaryStructureID, intTenantID, intCompanyID
    )
    return buildResponse(True, "Salary structure deleted successfully.", {"blnSuccess": True})
