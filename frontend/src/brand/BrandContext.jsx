import React, { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";

/*
 * Brand context — carries per-tenant assets (partner logo, brand name,
 * agreement route prefix). Colours are handled at the CSS-variable layer
 * via the `.brand-<name>` wrapper class in App.css, so this context only
 * has to expose things that CSS can't (logo URLs, brand identifiers,
 * URL prefixes).
 */

export const GAZEAL_LOGO =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

export const BALGORES_LOGO =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/mtuv9mso_download%20%281%29.webp";

const BRANDS = {
  gazeal: {
    id: "gazeal",
    label: "Gazeal Surveys",
    partnerLogo: null,
    partnerLabel: null,
    routePrefix: "",              // '/', '/order-survey', '/pricing', '/agreement/:token'
    themeClass: "brand-gazeal",
  },
  balgores: {
    id: "balgores",
    label: "Gazeal Surveys × Balgores",
    partnerLogo: BALGORES_LOGO,
    partnerLabel: "Balgores",
    routePrefix: "/balgores",     // '/balgores', '/balgores/order-survey', etc.
    themeClass: "brand-balgores",
  },
};

const BrandContext = createContext(BRANDS.gazeal);

export const BrandProvider = ({ brand = "gazeal", children }) => {
  const value = useMemo(() => BRANDS[brand] || BRANDS.gazeal, [brand]);
  return (
    <BrandContext.Provider value={value}>
      <div className={value.themeClass}>{children}</div>
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);

/**
 * Handy path builder — usage: brandPath(brand, "/pricing") →
 *   "/pricing"           when brand.id === "gazeal"
 *   "/balgores/pricing"  when brand.id === "balgores"
 * Empty ("/") stays as the brand root.
 */
export const brandPath = (brand, subpath = "") => {
  const prefix = brand?.routePrefix || "";
  if (!subpath || subpath === "/") return prefix || "/";
  return `${prefix}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
};

/** Detect the brand from a pathname — useful outside React tree. */
export const brandFromPath = (pathname) =>
  pathname && pathname.startsWith("/balgores") ? "balgores" : "gazeal";
