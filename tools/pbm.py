from pathlib import Path

BASE = Path(r"d:\WorkingFolder\SVNProjects\HRMS\HRMS_Backend\app")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"{label} anchor not found")
    return text.replace(old, new, 1)


def write(path: Path, text: str) -> None:
    path.write_text(text)


def patch_schema() -> None:
    path = BASE / "schemas" / "MasterSchema.py"
    text = path.read_text()
    if "class clsCostCenterRequestSchema(BaseModel):" in text:
        return
    anchor = '''class clsLocationRequestSchema(BaseModel):
    strLocationCode: str = Field(min_length=1, max_length=50)
    strLocationName: str = Field(min_length=1, max_length=150)
    intStateID: int | None = Field(default=None, gt=0)
    strCityName: str | None = Field(default=None, max_length=100)
    blnIsActive: bool = True

    @field_validator(
        "strLocationCode", "strLocationName", "strCityName", mode="before"
    )
    @classmethod
    def normalizeLocationText(cls, objValue: str | None):
        if objValue is None:
            return None
        strValue = str(objValue).strip()
        return strValue or None


'''
    replacement = anchor + '''class clsCostCenterRequestSchema(BaseModel):
    strCostCenterCode: str = Field(min_length=1, max_length=50)
    strCostCenterName: str = Field(min_length=1, max_length=150)
    blnIsActive: bool = True

    @field_validator("strCostCenterCode", "strCostCenterName", mode="before")
    @classmethod
    def normalizeCostCenterText(cls, objValue: str | None):
        if objValue is None:
            return None
        strValue = str(objValue).strip()
        return strValue or None


'''
    write(path, replace_once(text, anchor, replacement, "MasterSchema.py"))


def patch_service() -> None:
    path = BASE / "services" / "MasterService.py"
    text = path.read_text()
    old_import = '''from app.schemas.MasterSchema import (
    clsCountryRequestSchema,
    clsDepartmentRequestSchema,
    clsDesignationRequestSchema,
    clsEmployeeAddressRequestSchema,
    clsEmployeeBankAccountRequestSchema,
    clsEmployeeRequestSchema,
    clsEmployeeStatutoryRequestSchema,
    clsStateRequestSchema,
    clsUserRequestSchema,
)
'''
    new_import = '''from app.schemas.MasterSchema import (
    clsBankRequestSchema,
    clsCostCenterRequestSchema,
    clsCountryRequestSchema,
    clsDepartmentRequestSchema,
    clsDesignationRequestSchema,
    clsEmployeeAddressRequestSchema,
    clsEmployeeBankAccountRequestSchema,
    clsEmployeeRequestSchema,
    clsEmployeeStatutoryRequestSchema,
    clsGradeRequestSchema,
    clsLocationRequestSchema,
    clsStateRequestSchema,
    clsUserRequestSchema,
)
'''
    if old_import in text:
        text = text.replace(old_import, new_import, 1)
    if "async def listBanks(" not in text:
        anchor = '''    async def bulkDesignationDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        # Bulk-deletes designations within the current tenant scope.
        self.objRepository.bulkDesignationDelete(lstIDs, intTenantID)

'''
        insert = anchor + '''    async def listBanks(self, intTenantID: int, strSearchName: str | None, strSearchCode: str | None, blnIsActive: bool | None):
        return self.objRepository.listBanks(intTenantID, strSearchName, strSearchCode, blnIsActive)

    async def getBank(self, intBankID: int, intTenantID: int):
        return self.objRepository.getBank(intBankID, intTenantID)

    async def createBank(self, objPayload: clsBankRequestSchema, intTenantID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strBankCode"] = objPayload.strBankCode.strip().upper()
        dicPayload["strBankName"] = objPayload.strBankName.strip()
        return self.objRepository.createBank(dicPayload, intTenantID)

    async def updateBank(self, intBankID: int, objPayload: clsBankRequestSchema, intTenantID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strBankCode"] = objPayload.strBankCode.strip().upper()
        dicPayload["strBankName"] = objPayload.strBankName.strip()
        return self.objRepository.updateBank(intBankID, dicPayload, intTenantID)

    async def bulkBankStatus(self, lstIDs: list[int], blnIsActive: bool, intTenantID: int) -> None:
        self.objRepository.bulkBankStatus(lstIDs, blnIsActive, intTenantID)

    async def bulkBankDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        self.objRepository.bulkBankDelete(lstIDs, intTenantID)

    async def listCostCenters(self, intTenantID: int, intCompanyID: int, strSearchName: str | None, strSearchCode: str | None, blnIsActive: bool | None):
        return self.objRepository.listCostCenters(intTenantID, intCompanyID, strSearchName, strSearchCode, blnIsActive)

    async def getCostCenter(self, intCostCenterID: int, intTenantID: int, intCompanyID: int):
        return self.objRepository.getCostCenter(intCostCenterID, intTenantID, intCompanyID)

    async def createCostCenter(self, objPayload: clsCostCenterRequestSchema, intTenantID: int, intCompanyID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strCostCenterCode"] = objPayload.strCostCenterCode.strip().upper()
        dicPayload["strCostCenterName"] = objPayload.strCostCenterName.strip()
        return self.objRepository.createCostCenter(dicPayload, intTenantID, intCompanyID)

    async def updateCostCenter(self, intCostCenterID: int, objPayload: clsCostCenterRequestSchema, intTenantID: int, intCompanyID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strCostCenterCode"] = objPayload.strCostCenterCode.strip().upper()
        dicPayload["strCostCenterName"] = objPayload.strCostCenterName.strip()
        return self.objRepository.updateCostCenter(intCostCenterID, dicPayload, intTenantID, intCompanyID)

    async def bulkCostCenterStatus(self, lstIDs: list[int], blnIsActive: bool, intTenantID: int, intCompanyID: int) -> None:
        self.objRepository.bulkCostCenterStatus(lstIDs, blnIsActive, intTenantID, intCompanyID)

    async def bulkCostCenterDelete(self, lstIDs: list[int], intTenantID: int, intCompanyID: int) -> None:
        self.objRepository.bulkCostCenterDelete(lstIDs, intTenantID, intCompanyID)

    async def listGrades(self, intTenantID: int, strSearchName: str | None, strSearchCode: str | None, blnIsActive: bool | None):
        return self.objRepository.listGrades(intTenantID, strSearchName, strSearchCode, blnIsActive)

    async def getGrade(self, intGradeID: int, intTenantID: int):
        return self.objRepository.getGrade(intGradeID, intTenantID)

    async def createGrade(self, objPayload: clsGradeRequestSchema, intTenantID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strGradeCode"] = objPayload.strGradeCode.strip().upper()
        dicPayload["strGradeName"] = objPayload.strGradeName.strip()
        return self.objRepository.createGrade(dicPayload, intTenantID)

    async def updateGrade(self, intGradeID: int, objPayload: clsGradeRequestSchema, intTenantID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strGradeCode"] = objPayload.strGradeCode.strip().upper()
        dicPayload["strGradeName"] = objPayload.strGradeName.strip()
        return self.objRepository.updateGrade(intGradeID, dicPayload, intTenantID)

    async def bulkGradeStatus(self, lstIDs: list[int], blnIsActive: bool, intTenantID: int) -> None:
        self.objRepository.bulkGradeStatus(lstIDs, blnIsActive, intTenantID)

    async def bulkGradeDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        self.objRepository.bulkGradeDelete(lstIDs, intTenantID)

    async def listLocations(self, intTenantID: int, intCompanyID: int, strSearchName: str | None, strSearchCode: str | None, blnIsActive: bool | None):
        return self.objRepository.listLocations(intTenantID, intCompanyID, strSearchName, strSearchCode, blnIsActive)

    async def getLocation(self, intLocationID: int, intTenantID: int, intCompanyID: int):
        return self.objRepository.getLocation(intLocationID, intTenantID, intCompanyID)

    async def getLocationFormOptions(self):
        return self.objRepository.getLocationFormOptions()

    async def createLocation(self, objPayload: clsLocationRequestSchema, intTenantID: int, intCompanyID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strLocationCode"] = objPayload.strLocationCode.strip().upper()
        dicPayload["strLocationName"] = objPayload.strLocationName.strip()
        dicPayload["strCityName"] = objPayload.strCityName.strip() if objPayload.strCityName else None
        return self.objRepository.createLocation(dicPayload, intTenantID, intCompanyID)

    async def updateLocation(self, intLocationID: int, objPayload: clsLocationRequestSchema, intTenantID: int, intCompanyID: int):
        dicPayload = objPayload.model_dump()
        dicPayload["strLocationCode"] = objPayload.strLocationCode.strip().upper()
        dicPayload["strLocationName"] = objPayload.strLocationName.strip()
        dicPayload["strCityName"] = objPayload.strCityName.strip() if objPayload.strCityName else None
        return self.objRepository.updateLocation(intLocationID, dicPayload, intTenantID, intCompanyID)

    async def bulkLocationStatus(self, lstIDs: list[int], blnIsActive: bool, intTenantID: int, intCompanyID: int) -> None:
        self.objRepository.bulkLocationStatus(lstIDs, blnIsActive, intTenantID, intCompanyID)

    async def bulkLocationDelete(self, lstIDs: list[int], intTenantID: int, intCompanyID: int) -> None:
        self.objRepository.bulkLocationDelete(lstIDs, intTenantID, intCompanyID)

'''
        text = replace_once(text, anchor, insert, "MasterService methods")
    write(path, text)


def patch_routes() -> None:
    path = BASE / "api" / "v1" / "MasterRoutes.py"
    text = path.read_text()
    old_import = '''from app.schemas.MasterSchema import (
    clsBankRequestSchema,
    clsBulkDeleteRequestSchema,
    clsBulkStatusRequestSchema,
    clsCountryRequestSchema,
    clsDepartmentRequestSchema,
    clsDesignationRequestSchema,
    clsEmployeeAddressRequestSchema,
    clsEmployeeBankAccountRequestSchema,
    clsEmployeeRequestSchema,
    clsEmployeeStatutoryRequestSchema,
    clsGradeRequestSchema,
    clsLocationRequestSchema,
)
'''
    new_import = '''from app.schemas.MasterSchema import (
    clsBankRequestSchema,
    clsBulkDeleteRequestSchema,
    clsBulkStatusRequestSchema,
    clsCostCenterRequestSchema,
    clsCountryRequestSchema,
    clsDepartmentRequestSchema,
    clsDesignationRequestSchema,
    clsEmployeeAddressRequestSchema,
    clsEmployeeBankAccountRequestSchema,
    clsEmployeeRequestSchema,
    clsEmployeeStatutoryRequestSchema,
    clsGradeRequestSchema,
    clsLocationRequestSchema,
    clsStateRequestSchema,
    clsUserRequestSchema,
)
'''
    if old_import in text:
        text = text.replace(old_import, new_import, 1)
    if '@objRouter.get("/banks")' not in text:
        anchor = '''@objRouter.post("/designations/bulk-delete")
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


'''
        insert = anchor + '''@objRouter.get("/banks")
async def listBanks(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listBanks(intTenantID, strSearchName, strSearchCode, parseStatus(strStatus))
    return buildResponse(True, "Bank list fetched successfully.", lstRecords)


@objRouter.post("/banks", status_code=status.HTTP_201_CREATED)
async def createBank(objRequest: Request, objPayload: clsBankRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createBank(objPayload, intTenantID)
    return buildResponse(True, "Bank saved successfully.", dicRecord)


@objRouter.put("/banks/{intBankID}")
async def updateBank(intBankID: int, objRequest: Request, objPayload: clsBankRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateBank(intBankID, objPayload, intTenantID)
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
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listCostCenters(intTenantID, intCompanyID, strSearchName, strSearchCode, parseStatus(strStatus))
    return buildResponse(True, "Cost center list fetched successfully.", lstRecords)


@objRouter.post("/cost-centers", status_code=status.HTTP_201_CREATED)
async def createCostCenter(objRequest: Request, objPayload: clsCostCenterRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createCostCenter(objPayload, intTenantID, intCompanyID)
    return buildResponse(True, "Cost center saved successfully.", dicRecord)


@objRouter.put("/cost-centers/{intCostCenterID}")
async def updateCostCenter(intCostCenterID: int, objRequest: Request, objPayload: clsCostCenterRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateCostCenter(intCostCenterID, objPayload, intTenantID, intCompanyID)
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


'''
        text = replace_once(text, anchor, insert, "MasterRoutes bank/cost-center block")
    if '@objRouter.get("/grades")' not in text:
        anchor = '''@objRouter.post("/states/bulk-delete")
async def bulkStateDelete(
    objPayload: clsBulkDeleteRequestSchema,
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    await objMasterService.bulkStateDelete(objPayload.lstIDs)
    return buildResponse(
        True, "State records deleted successfully.", {"blnSuccess": True}
    )


'''
        insert = anchor + '''@objRouter.get("/grades")
async def listGrades(
    objRequest: Request,
    strSearchName: str | None = Query(default=None),
    strSearchCode: str | None = Query(default=None),
    strStatus: str | None = Query(default=None),
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    lstRecords = await objMasterService.listGrades(intTenantID, strSearchName, strSearchCode, parseStatus(strStatus))
    return buildResponse(True, "Grade list fetched successfully.", lstRecords)


@objRouter.post("/grades", status_code=status.HTTP_201_CREATED)
async def createGrade(objRequest: Request, objPayload: clsGradeRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.createGrade(objPayload, intTenantID)
    return buildResponse(True, "Grade saved successfully.", dicRecord)


@objRouter.put("/grades/{intGradeID}")
async def updateGrade(intGradeID: int, objRequest: Request, objPayload: clsGradeRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, _ = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateGrade(intGradeID, objPayload, intTenantID)
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
    objMasterService: clsMasterService = Depends(getMasterService),
) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    lstRecords = await objMasterService.listLocations(intTenantID, intCompanyID, strSearchName, strSearchCode, parseStatus(strStatus))
    return buildResponse(True, "Location list fetched successfully.", lstRecords)


@objRouter.get("/locations/form-options")
async def getLocationFormOptions(objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    dicOptions = await objMasterService.getLocationFormOptions()
    return buildResponse(True, "Location form options fetched successfully.", dicOptions)


@objRouter.post("/locations", status_code=status.HTTP_201_CREATED)
async def createLocation(objRequest: Request, objPayload: clsLocationRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.createLocation(objPayload, intTenantID, intCompanyID)
    return buildResponse(True, "Location saved successfully.", dicRecord)


@objRouter.put("/locations/{intLocationID}")
async def updateLocation(intLocationID: int, objRequest: Request, objPayload: clsLocationRequestSchema, objMasterService: clsMasterService = Depends(getMasterService)) -> dict:
    intTenantID, intCompanyID = getRequestContext(objRequest)
    dicRecord = await objMasterService.updateLocation(intLocationID, objPayload, intTenantID, intCompanyID)
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


'''
        text = replace_once(text, anchor, insert, "MasterRoutes grade/location block")
    write(path, text)

def patch_repository() -> None:
    path = BASE / "repositories" / "MasterRepository.py"
    text = path.read_text()

    if "def buildBankScope(self, intTenantID: int) -> list[Any]:" not in text:
        anchor = '''    def buildLocationScope(self, intTenantID: int, intCompanyID: int) -> list[Any]:
        # Location records are partitioned by both tenant and company.
        return [
            clsLocationModel.intTenantID == intTenantID,
            clsLocationModel.intCompanyID == intCompanyID,
        ]

'''
        insert = anchor + '''    def buildBankScope(self, intTenantID: int) -> list[Any]:
        # Bank records are tenant-scoped.
        return [clsBankModel.intTenantID == intTenantID]

    def buildGradeScope(self, intTenantID: int) -> list[Any]:
        # Grade records are tenant-scoped.
        return [clsGradeModel.intTenantID == intTenantID]

'''
        text = replace_once(text, anchor, insert, "MasterRepository build scopes")

    old_bank_exists = '''    def ensureBankExists(self, intBankID: int, intTenantID: int) -> clsBankModel:
        objBank = self.objSession.scalar(
            select(clsBankModel).where(
                clsBankModel.intID == intBankID,
                *self.buildBankScope(intTenantID),
                clsBankModel.blnIsActive.is_(True),
            )
        )
        if not objBank:
            raise ResourceNotFoundException("Bank record not found.")
        return objBank

'''
    new_bank_exists = '''    def ensureBankExists(self, intBankID: int, intTenantID: int) -> clsBankModel:
        objBank = self.objSession.scalar(
            select(clsBankModel).where(
                clsBankModel.intID == intBankID,
                *self.buildBankScope(intTenantID),
            )
        )
        if not objBank:
            raise ResourceNotFoundException("Bank record not found.")
        return objBank

    def ensureGradeExists(self, intGradeID: int, intTenantID: int) -> clsGradeModel:
        objGrade = self.objSession.scalar(
            select(clsGradeModel).where(
                clsGradeModel.intID == intGradeID,
                *self.buildGradeScope(intTenantID),
            )
        )
        if not objGrade:
            raise ResourceNotFoundException("Grade record not found.")
        return objGrade

    def ensureLocationExists(
        self, intLocationID: int, intTenantID: int, intCompanyID: int
    ) -> clsLocationModel:
        objLocation = self.objSession.scalar(
            select(clsLocationModel).where(
                clsLocationModel.intID == intLocationID,
                *self.buildLocationScope(intTenantID, intCompanyID),
            )
        )
        if not objLocation:
            raise ResourceNotFoundException("Location record not found.")
        return objLocation

    def ensureCostCenterExists(
        self, intCostCenterID: int, intTenantID: int, intCompanyID: int
    ) -> clsCostCenterModel:
        objCostCenter = self.objSession.scalar(
            select(clsCostCenterModel).where(
                clsCostCenterModel.intID == intCostCenterID,
                *self.buildCostCenterScope(intTenantID, intCompanyID),
            )
        )
        if not objCostCenter:
            raise ResourceNotFoundException("Cost center record not found.")
        return objCostCenter

    def ensureUniqueBank(
        self,
        strBankCode: str,
        strBankName: str,
        intTenantID: int,
        intBankID: int | None = None,
    ) -> None:
        objExisting = self.objSession.scalar(
            select(clsBankModel).where(
                *self.buildBankScope(intTenantID),
                or_(
                    func.upper(clsBankModel.strBankCode) == strBankCode.upper(),
                    func.lower(clsBankModel.strBankName) == strBankName.lower(),
                ),
            )
        )
        if objExisting and objExisting.intID != intBankID:
            raise ConflictException("Bank code or bank name already exists.")

    def ensureUniqueGrade(
        self,
        strGradeCode: str,
        strGradeName: str,
        intTenantID: int,
        intGradeID: int | None = None,
    ) -> None:
        objExisting = self.objSession.scalar(
            select(clsGradeModel).where(
                *self.buildGradeScope(intTenantID),
                or_(
                    func.upper(clsGradeModel.strGradeCode) == strGradeCode.upper(),
                    func.lower(clsGradeModel.strGradeName) == strGradeName.lower(),
                ),
            )
        )
        if objExisting and objExisting.intID != intGradeID:
            raise ConflictException("Grade code or grade name already exists.")

    def ensureUniqueLocation(
        self,
        strLocationCode: str,
        strLocationName: str,
        intTenantID: int,
        intCompanyID: int,
        intLocationID: int | None = None,
    ) -> None:
        objExisting = self.objSession.scalar(
            select(clsLocationModel).where(
                *self.buildLocationScope(intTenantID, intCompanyID),
                or_(
                    func.upper(clsLocationModel.strLocationCode)
                    == strLocationCode.upper(),
                    func.lower(clsLocationModel.strLocationName)
                    == strLocationName.lower(),
                ),
            )
        )
        if objExisting and objExisting.intID != intLocationID:
            raise ConflictException("Location code or location name already exists.")

    def ensureUniqueCostCenter(
        self,
        strCostCenterCode: str,
        strCostCenterName: str,
        intTenantID: int,
        intCompanyID: int,
        intCostCenterID: int | None = None,
    ) -> None:
        objExisting = self.objSession.scalar(
            select(clsCostCenterModel).where(
                *self.buildCostCenterScope(intTenantID, intCompanyID),
                or_(
                    func.upper(clsCostCenterModel.strCostCenterCode)
                    == strCostCenterCode.upper(),
                    func.lower(clsCostCenterModel.strCostCenterName)
                    == strCostCenterName.lower(),
                ),
            )
        )
        if objExisting and objExisting.intID != intCostCenterID:
            raise ConflictException(
                "Cost center code or cost center name already exists."
            )

'''
    if old_bank_exists in text:
        text = text.replace(old_bank_exists, new_bank_exists, 1)

    if "def listBanks(" not in text:
        anchor = '''    def bulkDesignationDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        self.objSession.execute(
            delete(clsDesignationModel).where(
                clsDesignationModel.intID.in_(lstIDs),
                *self.buildDesignationScope(intTenantID),
            )
        )
        commitOrRollback(self.objSession)

'''
        insert = anchor + '''    def listBanks(
        self,
        intTenantID: int,
        strSearchName: str | None = None,
        strSearchCode: str | None = None,
        blnIsActive: bool | None = None,
    ) -> list[dict[str, Any]]:
        objStatement: Select = (
            select(clsBankModel)
            .where(*self.buildBankScope(intTenantID))
            .order_by(clsBankModel.strBankName.asc(), clsBankModel.intID.asc())
        )
        if strSearchName:
            objStatement = objStatement.where(
                clsBankModel.strBankName.ilike(f"%{strSearchName.strip()}%")
            )
        if strSearchCode:
            objStatement = objStatement.where(
                clsBankModel.strBankCode.ilike(f"%{strSearchCode.strip()}%")
            )
        if blnIsActive is not None:
            objStatement = objStatement.where(clsBankModel.blnIsActive == blnIsActive)
        return [
            self.serializeBank(objBank)
            for objBank in self.objSession.scalars(objStatement).all()
        ]

    def getBank(self, intBankID: int, intTenantID: int) -> dict[str, Any]:
        return self.serializeBank(self.ensureBankExists(intBankID, intTenantID))

    def createBank(self, dicPayload: dict[str, Any], intTenantID: int) -> dict[str, Any]:
        self.ensureUniqueBank(
            dicPayload["strBankCode"], dicPayload["strBankName"], intTenantID
        )
        objBank = clsBankModel(
            intID=self.getNextID(clsBankModel),
            intTenantID=intTenantID,
            strBankCode=dicPayload["strBankCode"],
            strBankName=dicPayload["strBankName"],
            blnIsActive=dicPayload["blnIsActive"],
        )
        self.objSession.add(objBank)
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objBank)
        return self.serializeBank(objBank)

    def updateBank(
        self, intBankID: int, dicPayload: dict[str, Any], intTenantID: int
    ) -> dict[str, Any]:
        objBank = self.ensureBankExists(intBankID, intTenantID)
        self.ensureUniqueBank(
            dicPayload["strBankCode"],
            dicPayload["strBankName"],
            intTenantID,
            intBankID,
        )
        objBank.strBankCode = dicPayload["strBankCode"]
        objBank.strBankName = dicPayload["strBankName"]
        objBank.blnIsActive = dicPayload["blnIsActive"]
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objBank)
        return self.serializeBank(objBank)

    def bulkBankStatus(
        self, lstIDs: list[int], blnIsActive: bool, intTenantID: int
    ) -> None:
        lstBanks = self.objSession.scalars(
            select(clsBankModel).where(
                clsBankModel.intID.in_(lstIDs),
                *self.buildBankScope(intTenantID),
            )
        ).all()
        if not lstBanks:
            raise ResourceNotFoundException(
                "No bank records found for the requested action."
            )
        for objBank in lstBanks:
            objBank.blnIsActive = blnIsActive
        commitOrRollback(self.objSession)

    def bulkBankDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        self.objSession.execute(
            delete(clsBankModel).where(
                clsBankModel.intID.in_(lstIDs),
                *self.buildBankScope(intTenantID),
            )
        )
        commitOrRollback(self.objSession)

    def listCostCenters(
        self,
        intTenantID: int,
        intCompanyID: int,
        strSearchName: str | None = None,
        strSearchCode: str | None = None,
        blnIsActive: bool | None = None,
    ) -> list[dict[str, Any]]:
        objStatement: Select = (
            select(clsCostCenterModel)
            .where(*self.buildCostCenterScope(intTenantID, intCompanyID))
            .order_by(
                clsCostCenterModel.strCostCenterName.asc(),
                clsCostCenterModel.intID.asc(),
            )
        )
        if strSearchName:
            objStatement = objStatement.where(
                clsCostCenterModel.strCostCenterName.ilike(
                    f"%{strSearchName.strip()}%"
                )
            )
        if strSearchCode:
            objStatement = objStatement.where(
                clsCostCenterModel.strCostCenterCode.ilike(
                    f"%{strSearchCode.strip()}%"
                )
            )
        if blnIsActive is not None:
            objStatement = objStatement.where(
                clsCostCenterModel.blnIsActive == blnIsActive
            )
        return [
            self.serializeCostCenter(objCostCenter)
            for objCostCenter in self.objSession.scalars(objStatement).all()
        ]

    def getCostCenter(
        self, intCostCenterID: int, intTenantID: int, intCompanyID: int
    ) -> dict[str, Any]:
        return self.serializeCostCenter(
            self.ensureCostCenterExists(intCostCenterID, intTenantID, intCompanyID)
        )

    def createCostCenter(
        self, dicPayload: dict[str, Any], intTenantID: int, intCompanyID: int
    ) -> dict[str, Any]:
        self.ensureUniqueCostCenter(
            dicPayload["strCostCenterCode"],
            dicPayload["strCostCenterName"],
            intTenantID,
            intCompanyID,
        )
        objCostCenter = clsCostCenterModel(
            intID=self.getNextID(clsCostCenterModel),
            intTenantID=intTenantID,
            intCompanyID=intCompanyID,
            strCostCenterCode=dicPayload["strCostCenterCode"],
            strCostCenterName=dicPayload["strCostCenterName"],
            blnIsActive=dicPayload["blnIsActive"],
        )
        self.objSession.add(objCostCenter)
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objCostCenter)
        return self.serializeCostCenter(objCostCenter)

    def updateCostCenter(
        self,
        intCostCenterID: int,
        dicPayload: dict[str, Any],
        intTenantID: int,
        intCompanyID: int,
    ) -> dict[str, Any]:
        objCostCenter = self.ensureCostCenterExists(
            intCostCenterID, intTenantID, intCompanyID
        )
        self.ensureUniqueCostCenter(
            dicPayload["strCostCenterCode"],
            dicPayload["strCostCenterName"],
            intTenantID,
            intCompanyID,
            intCostCenterID,
        )
        objCostCenter.strCostCenterCode = dicPayload["strCostCenterCode"]
        objCostCenter.strCostCenterName = dicPayload["strCostCenterName"]
        objCostCenter.blnIsActive = dicPayload["blnIsActive"]
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objCostCenter)
        return self.serializeCostCenter(objCostCenter)

    def bulkCostCenterStatus(
        self,
        lstIDs: list[int],
        blnIsActive: bool,
        intTenantID: int,
        intCompanyID: int,
    ) -> None:
        lstCostCenters = self.objSession.scalars(
            select(clsCostCenterModel).where(
                clsCostCenterModel.intID.in_(lstIDs),
                *self.buildCostCenterScope(intTenantID, intCompanyID),
            )
        ).all()
        if not lstCostCenters:
            raise ResourceNotFoundException(
                "No cost center records found for the requested action."
            )
        for objCostCenter in lstCostCenters:
            objCostCenter.blnIsActive = blnIsActive
        commitOrRollback(self.objSession)

    def bulkCostCenterDelete(
        self, lstIDs: list[int], intTenantID: int, intCompanyID: int
    ) -> None:
        self.objSession.execute(
            delete(clsCostCenterModel).where(
                clsCostCenterModel.intID.in_(lstIDs),
                *self.buildCostCenterScope(intTenantID, intCompanyID),
            )
        )
        commitOrRollback(self.objSession)

    def listGrades(
        self,
        intTenantID: int,
        strSearchName: str | None = None,
        strSearchCode: str | None = None,
        blnIsActive: bool | None = None,
    ) -> list[dict[str, Any]]:
        objStatement: Select = (
            select(clsGradeModel)
            .where(*self.buildGradeScope(intTenantID))
            .order_by(clsGradeModel.strGradeName.asc(), clsGradeModel.intID.asc())
        )
        if strSearchName:
            objStatement = objStatement.where(
                clsGradeModel.strGradeName.ilike(f"%{strSearchName.strip()}%")
            )
        if strSearchCode:
            objStatement = objStatement.where(
                clsGradeModel.strGradeCode.ilike(f"%{strSearchCode.strip()}%")
            )
        if blnIsActive is not None:
            objStatement = objStatement.where(
                clsGradeModel.blnIsActive == blnIsActive
            )
        return [
            self.serializeGrade(objGrade)
            for objGrade in self.objSession.scalars(objStatement).all()
        ]

    def getGrade(self, intGradeID: int, intTenantID: int) -> dict[str, Any]:
        return self.serializeGrade(self.ensureGradeExists(intGradeID, intTenantID))

    def createGrade(
        self, dicPayload: dict[str, Any], intTenantID: int
    ) -> dict[str, Any]:
        self.ensureUniqueGrade(
            dicPayload["strGradeCode"], dicPayload["strGradeName"], intTenantID
        )
        objGrade = clsGradeModel(
            intID=self.getNextID(clsGradeModel),
            intTenantID=intTenantID,
            strGradeCode=dicPayload["strGradeCode"],
            strGradeName=dicPayload["strGradeName"],
            blnIsActive=dicPayload["blnIsActive"],
        )
        self.objSession.add(objGrade)
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objGrade)
        return self.serializeGrade(objGrade)

    def updateGrade(
        self, intGradeID: int, dicPayload: dict[str, Any], intTenantID: int
    ) -> dict[str, Any]:
        objGrade = self.ensureGradeExists(intGradeID, intTenantID)
        self.ensureUniqueGrade(
            dicPayload["strGradeCode"],
            dicPayload["strGradeName"],
            intTenantID,
            intGradeID,
        )
        objGrade.strGradeCode = dicPayload["strGradeCode"]
        objGrade.strGradeName = dicPayload["strGradeName"]
        objGrade.blnIsActive = dicPayload["blnIsActive"]
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objGrade)
        return self.serializeGrade(objGrade)

    def bulkGradeStatus(
        self, lstIDs: list[int], blnIsActive: bool, intTenantID: int
    ) -> None:
        lstGrades = self.objSession.scalars(
            select(clsGradeModel).where(
                clsGradeModel.intID.in_(lstIDs),
                *self.buildGradeScope(intTenantID),
            )
        ).all()
        if not lstGrades:
            raise ResourceNotFoundException(
                "No grade records found for the requested action."
            )
        for objGrade in lstGrades:
            objGrade.blnIsActive = blnIsActive
        commitOrRollback(self.objSession)

    def bulkGradeDelete(self, lstIDs: list[int], intTenantID: int) -> None:
        self.objSession.execute(
            delete(clsGradeModel).where(
                clsGradeModel.intID.in_(lstIDs),
                *self.buildGradeScope(intTenantID),
            )
        )
        commitOrRollback(self.objSession)

    def listLocations(
        self,
        intTenantID: int,
        intCompanyID: int,
        strSearchName: str | None = None,
        strSearchCode: str | None = None,
        blnIsActive: bool | None = None,
    ) -> list[dict[str, Any]]:
        objStatement = (
            select(clsLocationModel, clsStateModel.strStateName)
            .outerjoin(clsStateModel, clsStateModel.intID == clsLocationModel.intStateID)
            .where(*self.buildLocationScope(intTenantID, intCompanyID))
            .order_by(clsLocationModel.strLocationName.asc(), clsLocationModel.intID.asc())
        )
        if strSearchName:
            objStatement = objStatement.where(
                clsLocationModel.strLocationName.ilike(f"%{strSearchName.strip()}%")
            )
        if strSearchCode:
            objStatement = objStatement.where(
                clsLocationModel.strLocationCode.ilike(f"%{strSearchCode.strip()}%")
            )
        if blnIsActive is not None:
            objStatement = objStatement.where(
                clsLocationModel.blnIsActive == blnIsActive
            )
        return [
            self.serializeLocation(objRow[0], objRow[1])
            for objRow in self.objSession.execute(objStatement).all()
        ]

    def getLocation(
        self, intLocationID: int, intTenantID: int, intCompanyID: int
    ) -> dict[str, Any]:
        objLocation = self.ensureLocationExists(
            intLocationID, intTenantID, intCompanyID
        )
        strStateName = None
        if objLocation.intStateID:
            strStateName = self.objSession.scalar(
                select(clsStateModel.strStateName).where(
                    clsStateModel.intID == objLocation.intStateID
                )
            )
        return self.serializeLocation(objLocation, strStateName)

    def getLocationFormOptions(self) -> dict[str, Any]:
        return {
            "lstStates": self.buildLookupOptions(
                select(clsStateModel)
                .where(clsStateModel.blnIsActive.is_(True))
                .order_by(clsStateModel.strStateName.asc()),
                "strStateName",
                "strStateCode",
            )
        }

    def createLocation(
        self, dicPayload: dict[str, Any], intTenantID: int, intCompanyID: int
    ) -> dict[str, Any]:
        if dicPayload.get("intStateID"):
            self.ensureStateExists(dicPayload["intStateID"])
        self.ensureUniqueLocation(
            dicPayload["strLocationCode"],
            dicPayload["strLocationName"],
            intTenantID,
            intCompanyID,
        )
        objLocation = clsLocationModel(
            intID=self.getNextID(clsLocationModel),
            intTenantID=intTenantID,
            intCompanyID=intCompanyID,
            strLocationCode=dicPayload["strLocationCode"],
            strLocationName=dicPayload["strLocationName"],
            intStateID=dicPayload.get("intStateID"),
            strCityName=dicPayload.get("strCityName"),
            blnIsActive=dicPayload["blnIsActive"],
        )
        self.objSession.add(objLocation)
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objLocation)
        return self.getLocation(objLocation.intID, intTenantID, intCompanyID)

    def updateLocation(
        self,
        intLocationID: int,
        dicPayload: dict[str, Any],
        intTenantID: int,
        intCompanyID: int,
    ) -> dict[str, Any]:
        objLocation = self.ensureLocationExists(
            intLocationID, intTenantID, intCompanyID
        )
        if dicPayload.get("intStateID"):
            self.ensureStateExists(dicPayload["intStateID"])
        self.ensureUniqueLocation(
            dicPayload["strLocationCode"],
            dicPayload["strLocationName"],
            intTenantID,
            intCompanyID,
            intLocationID,
        )
        objLocation.strLocationCode = dicPayload["strLocationCode"]
        objLocation.strLocationName = dicPayload["strLocationName"]
        objLocation.intStateID = dicPayload.get("intStateID")
        objLocation.strCityName = dicPayload.get("strCityName")
        objLocation.blnIsActive = dicPayload["blnIsActive"]
        commitOrRollback(self.objSession)
        safeRefresh(self.objSession, objLocation)
        return self.getLocation(objLocation.intID, intTenantID, intCompanyID)

    def bulkLocationStatus(
        self,
        lstIDs: list[int],
        blnIsActive: bool,
        intTenantID: int,
        intCompanyID: int,
    ) -> None:
        lstLocations = self.objSession.scalars(
            select(clsLocationModel).where(
                clsLocationModel.intID.in_(lstIDs),
                *self.buildLocationScope(intTenantID, intCompanyID),
            )
        ).all()
        if not lstLocations:
            raise ResourceNotFoundException(
                "No location records found for the requested action."
            )
        for objLocation in lstLocations:
            objLocation.blnIsActive = blnIsActive
        commitOrRollback(self.objSession)

    def bulkLocationDelete(
        self, lstIDs: list[int], intTenantID: int, intCompanyID: int
    ) -> None:
        self.objSession.execute(
            delete(clsLocationModel).where(
                clsLocationModel.intID.in_(lstIDs),
                *self.buildLocationScope(intTenantID, intCompanyID),
            )
        )
        commitOrRollback(self.objSession)

'''
        text = replace_once(text, anchor, insert, "MasterRepository master CRUD methods")

    if "def serializeBank(self, objBank: clsBankModel)" not in text:
        anchor = '''    def serializeDepartment(self, objDepartment: clsDepartmentModel) -> dict[str, Any]:
        # The repository returns plain dictionaries so the response helper can serialize consistently.
        return {
            "intID": objDepartment.intID,
            "intTenantID": objDepartment.intTenantID,
            "intCompanyID": objDepartment.intCompanyID,
            "strDepartmentCode": objDepartment.strDepartmentCode,
            "strDepartmentName": objDepartment.strDepartmentName,
            "blnIsActive": objDepartment.blnIsActive,
        }

'''
        insert = '''    def serializeBank(self, objBank: clsBankModel) -> dict[str, Any]:
        return {
            "intID": objBank.intID,
            "intTenantID": objBank.intTenantID,
            "strBankCode": objBank.strBankCode,
            "strBankName": objBank.strBankName,
            "blnIsActive": objBank.blnIsActive,
        }

    def serializeCostCenter(
        self, objCostCenter: clsCostCenterModel
    ) -> dict[str, Any]:
        return {
            "intID": objCostCenter.intID,
            "intTenantID": objCostCenter.intTenantID,
            "intCompanyID": objCostCenter.intCompanyID,
            "strCostCenterCode": objCostCenter.strCostCenterCode,
            "strCostCenterName": objCostCenter.strCostCenterName,
            "blnIsActive": objCostCenter.blnIsActive,
        }

    def serializeGrade(self, objGrade: clsGradeModel) -> dict[str, Any]:
        return {
            "intID": objGrade.intID,
            "intTenantID": objGrade.intTenantID,
            "strGradeCode": objGrade.strGradeCode,
            "strGradeName": objGrade.strGradeName,
            "blnIsActive": objGrade.blnIsActive,
        }

    def serializeLocation(
        self, objLocation: clsLocationModel, strStateName: str | None = None
    ) -> dict[str, Any]:
        return {
            "intID": objLocation.intID,
            "intTenantID": objLocation.intTenantID,
            "intCompanyID": objLocation.intCompanyID,
            "strLocationCode": objLocation.strLocationCode,
            "strLocationName": objLocation.strLocationName,
            "intStateID": objLocation.intStateID,
            "strStateName": strStateName,
            "strCityName": objLocation.strCityName,
            "blnIsActive": objLocation.blnIsActive,
        }

''' + anchor
        text = replace_once(text, anchor, insert, "MasterRepository serializers")

    write(path, text)

def main() -> None:
    patch_schema()
    patch_service()
    patch_routes()
    patch_repository()


if __name__ == "__main__":
    main()
