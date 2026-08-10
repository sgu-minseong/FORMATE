import { useEffect, useRef, useState } from "react";
import { fetchPhotoCatalog } from "./photoApi";

export function usePhotoManagement({ companyId, createPhotoId, getFriendlyError }) {
  const [photoCatalog, setPhotoCatalog] = useState([]);
  const [photoCatalogLoading, setPhotoCatalogLoading] = useState(false);
  const [photoCatalogError, setPhotoCatalogError] = useState("");
  const companyIdRef = useRef(companyId);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  function reset() {
    requestRef.current += 1;
    setPhotoCatalog([]);
    setPhotoCatalogLoading(false);
    setPhotoCatalogError("");
  }

  async function refresh() {
    const requestCompanyId = companyId;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (!requestCompanyId) {
      reset();
      return [];
    }

    setPhotoCatalogLoading(true);
    setPhotoCatalogError("");
    try {
      const catalog = await fetchPhotoCatalog(requestCompanyId);
      if (
        !mountedRef.current
        || requestRef.current !== requestId
        || companyIdRef.current !== requestCompanyId
      ) return [];
      setPhotoCatalog(catalog);
      return catalog;
    } catch (error) {
      if (
        mountedRef.current
        && requestRef.current === requestId
        && companyIdRef.current === requestCompanyId
      ) {
        setPhotoCatalog([]);
        setPhotoCatalogError(getFriendlyError(error, "시공 항목을 불러오지 못했습니다."));
      }
      return [];
    } finally {
      if (
        mountedRef.current
        && requestRef.current === requestId
        && companyIdRef.current === requestCompanyId
      ) {
        setPhotoCatalogLoading(false);
      }
    }
  }

  useEffect(() => {
    companyIdRef.current = companyId;
    reset();
  }, [companyId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  return {
    companyId,
    createPhotoId,
    getFriendlyError,
    photoCatalog,
    photoCatalogLoading,
    photoCatalogError,
    refresh,
    reset,
  };
}
