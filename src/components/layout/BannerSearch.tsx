"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, TextField, Typography } from "@mui/material";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const options = useMemo(() => buildBannerSearchOptions(items), [items]);
  const suggestions = useMemo(() => input.trim() ? filterBannerSearchOptions(options, input).slice(0, 6) : [], [input, options]);
  const label = t("search_employees_departments_designations", "Search employees, departments, designations...");
  const suggestionsId = "app-banner-search-suggestions";

  const openOption = (route: string) => {
    setInput("");
    setNoMatch(false);
    setShowSuggestions(false);
    router.push(route);
  };

  return (
    <Box
      component="form"
      role="search"
      data-controlid="app-shell.search"
      onSubmit={event => {
        event.preventDefault();
        if (disabled || !input.trim()) return;
        const option = suggestions[activeSuggestion] ?? suggestions[0];
        if (option) {
          openOption(option.route);
        } else {
          setNoMatch(true);
          setShowSuggestions(false);
        }
      }}
      sx={{ width: "100%", position: "relative" }}
    >
      <TextField
        id="app-banner-search"
        className="app-mui-text-field app-mui-text-field--rounded"
        fullWidth
        size="small"
        value={input}
        onChange={event => {
          setInput(event.target.value);
          setNoMatch(false);
          setActiveSuggestion(0);
          setShowSuggestions(Boolean(event.target.value.trim()));
        }}
        onFocus={() => setShowSuggestions(Boolean(input.trim()))}
        onBlur={() => setShowSuggestions(false)}
        onKeyDown={event => {
          if (!showSuggestions || suggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveSuggestion(current => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveSuggestion(current => (current - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setShowSuggestions(false);
          }
        }}
        disabled={disabled}
        placeholder={label}
        error={noMatch}
        helperText={noMatch ? t("no_matching_pages", "No matching pages available") : undefined}
        FormHelperTextProps={{ role: "status", sx: { position: "absolute", top: "100%", m: 0, px: 1, bgcolor: "background.paper", borderRadius: 1, zIndex: 1 } }}
        inputProps={{
          "aria-label": label,
          "aria-autocomplete": "list",
          "aria-controls": showSuggestions ? suggestionsId : undefined,
          "aria-expanded": showSuggestions && suggestions.length > 0,
          "aria-activedescendant": showSuggestions && suggestions.length > 0 ? `${suggestionsId}-${activeSuggestion}` : undefined,
          "data-controlid": "app-shell.search.input"
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconButton type="submit" size="small" aria-label={t("search", "Search")} disabled={disabled || !input.trim()}>
                <SearchRoundedIcon sx={{ fontSize: 19, color: "#64748b" }} />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      {showSuggestions && suggestions.length > 0 ? (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: theme => theme.zIndex.modal,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5
          }}
        >
          <List id={suggestionsId} role="listbox" disablePadding>
            {suggestions.map((option, index) => (
              <ListItemButton
                id={`${suggestionsId}-${index}`}
                key={option.route}
                role="option"
                selected={index === activeSuggestion}
                aria-selected={index === activeSuggestion}
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => setActiveSuggestion(index)}
                onClick={() => openOption(option.route)}
                sx={{ minHeight: 38, px: 1.5, py: 0.25 }}
              >
                <Typography aria-hidden="true" sx={{ width: 30, flex: "0 0 30px", color: "text.secondary", fontSize: "1.15rem", fontWeight: 600 }}>
                  {option.label.charAt(0).toLocaleUpperCase()}
                </Typography>
                <ListItemText
                  primary={option.label}
                  secondary={option.section || undefined}
                  primaryTypographyProps={{ noWrap: true, fontSize: "0.9rem", lineHeight: 1.25, fontWeight: index === activeSuggestion ? 600 : 400 }}
                  secondaryTypographyProps={{ noWrap: true, fontSize: "0.7rem", lineHeight: 1.2 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      ) : null}
    </Box>
  );
}
