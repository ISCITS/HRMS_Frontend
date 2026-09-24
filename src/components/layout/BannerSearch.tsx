"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MenuItem } from "@/models/AuthModels";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { buildBannerSearchOptions, filterBannerSearchOptions } from "./bannerSearchOptions";

export default function BannerSearch({ items, disabled }: { items: MenuItem[]; disabled: boolean }) {
  const router = useRouter();
  const { t } = useModuleLabels("common");
  const [input, setInput] = useState("");
  const [noMatch, setNoMatch] = useState(false);
  const options = useMemo(() => buildBannerSearchOptions(items), [items]);
  const label = t("search_pages_modules", "Search pages and modules...");

  return (
    <Box
      component="form"
      role="search"
      data-controlid="app-shell.search"
      onSubmit={event => {
        event.preventDefault();
        if (disabled || !input.trim()) return;
        const [option] = filterBannerSearchOptions(options, input);
        if (option) {
          setInput("");
          setNoMatch(false);
          router.push(option.route);
        } else {
          setNoMatch(true);
        }
      }}
      sx={{ width: "100%", position: "relative" }}
    >
      <TextField
        id="app-banner-search"
        fullWidth
        size="small"
        value={input}
        onChange={event => {
          setInput(event.target.value);
          setNoMatch(false);
        }}
        disabled={disabled}
        placeholder={label}
        error={noMatch}
        helperText={noMatch ? t("no_matching_pages", "No matching pages available") : undefined}
        FormHelperTextProps={{ role: "status", sx: { position: "absolute", top: "100%", m: 0, px: 1, bgcolor: "background.paper", borderRadius: 1, zIndex: 1 } }}
        inputProps={{ "aria-label": label, "data-controlid": "app-shell.search.input" }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconButton type="submit" size="small" aria-label={t("search", "Search")} disabled={disabled || !input.trim()}>
                <SearchRoundedIcon sx={{ fontSize: 19, color: "#64748b" }} />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "24px", bgcolor: "#f8fafd", fontSize: "0.85rem", "& fieldset": { borderColor: "#dfe8f3" } } }}
      />
    </Box>
  );
}
