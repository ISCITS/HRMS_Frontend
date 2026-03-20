"use client";

import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import EmployeeAddressForm from "@/features/employeeMaster/EmployeeAddressForm";
import EmployeeBankDetailsForm from "@/features/employeeMaster/EmployeeBankDetailsForm";
import EmployeeBasicInfoForm from "@/features/employeeMaster/EmployeeBasicInfoForm";
import EmployeeStatutoryForm from "@/features/employeeMaster/EmployeeStatutoryForm";
import { employeeMasterService } from "@/features/employeeMaster/EmployeeMasterService";
import {
  defaultEmployeeBasicInfoValues,
  defaultEmployeeStatutoryValues,
  type EmployeeAddressFormValues,
  type EmployeeBankAccountFormValues,
  type EmployeeBasicInfoFormValues,
  type EmployeeDetail,
  type EmployeeLookups,
  type EmployeeStatutory
} from "@/features/employeeMaster/Types";

type EmployeeProfileWorkspaceProps = {
  intEmployeeID?: number;
};

type TabKey = "basic" | "address" | "bank" | "statutory";

export default function EmployeeProfileWorkspace({ intEmployeeID }: EmployeeProfileWorkspaceProps) {
  const [strActiveTab, setStrActiveTab] = useState<TabKey>("basic");
  const [objLookups, setObjLookups] = useState<EmployeeLookups | null>(null);
  const [objEmployee, setObjEmployee] = useState<EmployeeDetail | null>(null);
  const [blnIsBootstrapping, setBlnIsBootstrapping] = useState(true);
  const [blnIsSavingBasic, setBlnIsSavingBasic] = useState(false);
  const [blnIsSavingStatutory, setBlnIsSavingStatutory] = useState(false);
  const [strBannerMessage, setStrBannerMessage] = useState("");
  const [strErrorMessage, setStrErrorMessage] = useState("");

  useEffect(() => {
    let blnMounted = true;
    const loadPage = async () => {
      setBlnIsBootstrapping(true);
      setStrErrorMessage("");
      try {
        const objLookupData = await employeeMasterService.getLookups();
        if (!blnMounted) {
          return;
        }
        setObjLookups(objLookupData);
        if (intEmployeeID) {
          const objEmployeeData = await employeeMasterService.getEmployee(intEmployeeID);
          if (!blnMounted) {
            return;
          }
          setObjEmployee(objEmployeeData);
        }
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to load employee details.");
      } finally {
        if (blnMounted) {
          setBlnIsBootstrapping(false);
        }
      }
    };
    void loadPage();
    return () => {
      blnMounted = false;
    };
  }, [intEmployeeID]);

  const handleBasicSave = async (dicValues: EmployeeBasicInfoFormValues) => {
    setBlnIsSavingBasic(true);
    setStrErrorMessage("");
    try {
      const objSavedEmployee = objEmployee
        ? await employeeMasterService.updateEmployee(objEmployee.intID, dicValues)
        : await employeeMasterService.createEmployee(dicValues);
      setObjEmployee(objSavedEmployee);
      setStrBannerMessage(objEmployee ? "Basic information updated successfully." : "Employee created successfully. Child tabs are now available.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to save employee.");
    } finally {
      setBlnIsSavingBasic(false);
    }
  };

  const handleAddressCreate = async (dicValues: EmployeeAddressFormValues) => {
    if (!objEmployee) {
      return;
    }
    try {
      const dicSavedAddress = await employeeMasterService.createAddress(objEmployee.intID, dicValues);
      setObjEmployee({ ...objEmployee, lstAddresses: [...objEmployee.lstAddresses, dicSavedAddress] });
      setStrBannerMessage("Address saved successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to save address.");
      throw objError;
    }
  };

  const handleAddressUpdate = async (intAddressID: number, dicValues: EmployeeAddressFormValues) => {
    if (!objEmployee) {
      return;
    }
    try {
      const dicSavedAddress = await employeeMasterService.updateAddress(objEmployee.intID, intAddressID, dicValues);
      setObjEmployee({
        ...objEmployee,
        lstAddresses: objEmployee.lstAddresses.map((dicAddress) => (dicAddress.intID === intAddressID ? dicSavedAddress : dicAddress))
      });
      setStrBannerMessage("Address updated successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to update address.");
      throw objError;
    }
  };

  const handleAddressDelete = async (intAddressID: number) => {
    if (!objEmployee) {
      return;
    }
    try {
      await employeeMasterService.deleteAddress(objEmployee.intID, intAddressID);
      setObjEmployee({
        ...objEmployee,
        lstAddresses: objEmployee.lstAddresses.filter((dicAddress) => dicAddress.intID !== intAddressID)
      });
      setStrBannerMessage("Address deleted successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to delete address.");
      throw objError;
    }
  };

  const handleBankCreate = async (dicValues: EmployeeBankAccountFormValues) => {
    if (!objEmployee) {
      return;
    }
    try {
      const dicSavedBank = await employeeMasterService.createBankAccount(objEmployee.intID, dicValues);
      const lstOtherBanks = objEmployee.lstBankAccounts.filter((dicAccount) => !(dicSavedBank.blnIsPrimary && dicAccount.blnIsPrimary));
      setObjEmployee({ ...objEmployee, lstBankAccounts: [...lstOtherBanks, dicSavedBank] });
      setStrBannerMessage("Bank details saved successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to save bank details.");
      throw objError;
    }
  };

  const handleBankUpdate = async (intBankAccountID: number, dicValues: EmployeeBankAccountFormValues) => {
    if (!objEmployee) {
      return;
    }
    try {
      const dicSavedBank = await employeeMasterService.updateBankAccount(objEmployee.intID, intBankAccountID, dicValues);
      setObjEmployee({
        ...objEmployee,
        lstBankAccounts: objEmployee.lstBankAccounts.map((dicAccount) => {
          if (dicSavedBank.blnIsPrimary && dicAccount.intID !== intBankAccountID) {
            return { ...dicAccount, blnIsPrimary: false };
          }
          return dicAccount.intID === intBankAccountID ? dicSavedBank : dicAccount;
        })
      });
      setStrBannerMessage("Bank details updated successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to update bank details.");
      throw objError;
    }
  };

  const handleBankDelete = async (intBankAccountID: number) => {
    if (!objEmployee) {
      return;
    }
    try {
      await employeeMasterService.deleteBankAccount(objEmployee.intID, intBankAccountID);
      setObjEmployee({
        ...objEmployee,
        lstBankAccounts: objEmployee.lstBankAccounts.filter((dicAccount) => dicAccount.intID !== intBankAccountID)
      });
      setStrBannerMessage("Bank details deleted successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to delete bank details.");
      throw objError;
    }
  };

  const handleStatutorySave = async (dicValues: EmployeeStatutory) => {
    if (!objEmployee) {
      return;
    }
    setBlnIsSavingStatutory(true);
    try {
      const objStatutory = await employeeMasterService.saveStatutory(objEmployee.intID, dicValues);
      setObjEmployee({ ...objEmployee, objStatutory: objStatutory });
      setStrBannerMessage("Statutory details saved successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to save statutory details.");
    } finally {
      setBlnIsSavingStatutory(false);
    }
  };

  const blnHasPrimaryRecord = Boolean(objEmployee?.intID);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Button component={Link} href="/masters/employee" startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 1, px: 0 }}>
            Back to Employee Master
          </Button>
          <Typography variant="h4" fontWeight={800}>
            {objEmployee ? objEmployee.strFullName : "Create Employee"}
          </Typography>
        </Box>
      </Stack>

      {strBannerMessage ? <Alert severity="success" onClose={() => setStrBannerMessage("")}>{strBannerMessage}</Alert> : null}
      {strErrorMessage ? <Alert severity="error" onClose={() => setStrErrorMessage("")}>{strErrorMessage}</Alert> : null}

      <Box sx={{ overflow: "hidden", borderRadius: 1.5, bgcolor: "background.paper" }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1 }}>
          <Tabs value={strActiveTab} onChange={(_, strValue) => setStrActiveTab(strValue as TabKey)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<BadgeOutlinedIcon />} iconPosition="start" label="Basic Info" value="basic" />
            <Tab icon={<ApartmentOutlinedIcon />} iconPosition="start" label="Address" value="address" />
            <Tab icon={<PaymentsOutlinedIcon />} iconPosition="start" label="Bank Details" value="bank" />
            <Tab icon={<GavelOutlinedIcon />} iconPosition="start" label="Statutory" value="statutory" />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1180, mx: "auto", width: "100%" }}>
          {blnIsBootstrapping ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={48} />
              <Skeleton variant="rounded" height={220} />
              <Skeleton variant="rounded" height={220} />
            </Stack>
          ) : null}

          {!blnIsBootstrapping ? (
            <Box sx={{ display: strActiveTab === "basic" ? "block" : "none" }}>
              <EmployeeBasicInfoForm
                initialValues={objEmployee ?? defaultEmployeeBasicInfoValues}
                objLookups={objLookups}
                blnIsLoading={blnIsBootstrapping}
                blnIsSaving={blnIsSavingBasic}
                strMessage={!blnHasPrimaryRecord ? "Save the primary employee record first. The remaining tabs will open after that." : undefined}
                onSubmit={handleBasicSave}
              />
            </Box>
          ) : null}

          {!blnIsBootstrapping ? (
            <Box sx={{ display: strActiveTab === "address" ? "block" : "none" }}>
              <EmployeeAddressForm
                lstAddresses={objEmployee?.lstAddresses ?? []}
                objLookups={objLookups}
                blnDisabled={!blnHasPrimaryRecord}
                strMessage={!blnHasPrimaryRecord ? "This tab is available now. Save Basic Info first to persist address records." : undefined}
                onCreate={handleAddressCreate}
                onUpdate={handleAddressUpdate}
                onDelete={handleAddressDelete}
              />
            </Box>
          ) : null}

          {!blnIsBootstrapping ? (
            <Box sx={{ display: strActiveTab === "bank" ? "block" : "none" }}>
              <EmployeeBankDetailsForm
                lstBankAccounts={objEmployee?.lstBankAccounts ?? []}
                objLookups={objLookups}
                blnDisabled={!blnHasPrimaryRecord}
                strMessage={!blnHasPrimaryRecord ? "This tab is available now. Save Basic Info first to persist bank records." : undefined}
                onCreate={handleBankCreate}
                onUpdate={handleBankUpdate}
                onDelete={handleBankDelete}
              />
            </Box>
          ) : null}

          {!blnIsBootstrapping ? (
            <Box sx={{ display: strActiveTab === "statutory" ? "block" : "none" }}>
              <EmployeeStatutoryForm
                initialValues={objEmployee?.objStatutory ?? defaultEmployeeStatutoryValues}
                blnDisabled={!blnHasPrimaryRecord}
                blnIsSaving={blnIsSavingStatutory}
                strMessage={!blnHasPrimaryRecord ? "This tab is available now. Save Basic Info first to persist statutory details." : undefined}
                onSubmit={handleStatutorySave}
              />
            </Box>
          ) : null}

          {blnIsBootstrapping ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading employee workspace...</Typography>
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Stack>
  );
}
