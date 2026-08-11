import { useEffect, useRef, useState } from "react";
import {
  archiveCanonicalConstructionSubitem,
  archiveCanonicalVariantGroup,
  createCanonicalVariantProductAtomic,
  insertCanonicalVariantSubitem,
  updateCanonicalConstructionSubitem,
  updateCanonicalVariantGroup,
} from "../constructionCatalog/constructionCatalogApi";
import {
  CONSTRUCTION_PRODUCT_KINDS,
  buildConstructionVariantGroupWritePayload,
  buildConstructionVariantMetadataWritePayload,
  buildConstructionVariantSubitemInsertPayload,
} from "../constructionCatalog/constructionCatalogModel";
import { fetchPhotoCatalog } from "./photoApi";

export function usePhotoManagement({ companyId, createPhotoId, getFriendlyError }) {
  const [photoCatalog, setPhotoCatalog] = useState([]);
  const [photoCatalogLoading, setPhotoCatalogLoading] = useState(false);
  const [photoCatalogSaving, setPhotoCatalogSaving] = useState(false);
  const [photoCatalogError, setPhotoCatalogError] = useState("");
  const companyIdRef = useRef(companyId);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  function reset() {
    requestRef.current += 1;
    setPhotoCatalog([]);
    setPhotoCatalogLoading(false);
    setPhotoCatalogSaving(false);
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

  async function runCatalogMutation(operation, fallbackMessage) {
    if (!companyId || photoCatalogSaving) return false;
    setPhotoCatalogSaving(true);
    setPhotoCatalogError("");
    try {
      const result = await operation();
      await refresh();
      return result;
    } catch (error) {
      setPhotoCatalogError(
        getFriendlyError?.(error, fallbackMessage) || error?.message || fallbackMessage
      );
      return false;
    } finally {
      if (mountedRef.current) setPhotoCatalogSaving(false);
    }
  }

  function renameCatalogProduct(product, name) {
    const nextName = `${name ?? ""}`.trim();
    if (!nextName || !product?.constructionItemId) return Promise.resolve(false);
    return runCatalogMutation(async () => {
      if (product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
        await updateCanonicalVariantGroup(
          product.variantGroupId,
          product.constructionItemId,
          { display_name: nextName }
        );
      } else {
        await updateCanonicalConstructionSubitem(
          product.subitemId,
          product.constructionItemId,
          { name: nextName }
        );
      }
      return true;
    }, "항목 이름을 변경하지 못했습니다.");
  }

  function createCatalogProductVariant(product, draft) {
    if (
      product?.kind !== CONSTRUCTION_PRODUCT_KINDS.SUBITEM
      || !product.subitem?.id
      || !product.constructionItemId
    ) return Promise.resolve(false);

    return runCatalogMutation(() => createCanonicalVariantProductAtomic({
      companyId,
      constructionItemId: product.constructionItemId,
      sourceSubitemId: product.subitem.id,
      group: buildConstructionVariantGroupWritePayload({
        constructionItemId: product.constructionItemId,
        displayName: product.displayName,
        variantKind: draft.variantKind,
        variantValueType: draft.variantValueType,
        sortOrder: product.sortOrder ?? product.subitem.sort_order ?? 0,
      }),
      variant: {
        variant_value_type: draft.variantValueType,
        value: draft.value,
        unit: draft.unit,
      },
    }), "두께 옵션을 추가하지 못했습니다.");
  }

  function addCatalogProductVariant(product, draft, selectedSubitemId) {
    if (
      product?.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
      || !product.variantGroupId
      || !product.constructionItemId
    ) return Promise.resolve(false);

    const sourceVariant = (product.variants ?? []).find(
      (variant) => variant.constructionSubitemId === selectedSubitemId
    ) ?? product.variants?.[0];
    const nextSortOrder = product.allVariants?.length
      ? Math.max(...product.allVariants.map((variant) => variant.sortOrder ?? 0)) + 1
      : 0;

    return runCatalogMutation(() => insertCanonicalVariantSubitem(
      buildConstructionVariantSubitemInsertPayload({
        constructionItemId: product.constructionItemId,
        variantGroupId: product.variantGroupId,
        displayName: product.displayName,
        variantValueType: product.variantValueType,
        value: draft.value,
        unit: draft.unit,
        workUnit: sourceVariant?.subitem?.unit,
        sortOrder: nextSortOrder,
      })
    ), "제품 옵션을 추가하지 못했습니다.");
  }

  function updateCatalogProductVariant(product, variant, draft) {
    if (
      product?.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
      || !variant?.constructionSubitemId
    ) return Promise.resolve(false);

    return runCatalogMutation(async () => {
      const insertShape = buildConstructionVariantSubitemInsertPayload({
        constructionItemId: product.constructionItemId,
        variantGroupId: product.variantGroupId,
        displayName: product.displayName,
        variantValueType: product.variantValueType,
        value: draft.value,
        unit: draft.unit,
        workUnit: variant.subitem?.unit,
        sortOrder: variant.sortOrder,
      });
      return updateCanonicalConstructionSubitem(
        variant.constructionSubitemId,
        product.constructionItemId,
        {
          name: insertShape.name,
          ...buildConstructionVariantMetadataWritePayload({
            variantGroupId: product.variantGroupId,
            variantValueType: product.variantValueType,
            value: draft.value,
            unit: draft.unit,
          }),
        }
      );
    }, "제품 옵션을 수정하지 못했습니다.");
  }

  function updateCatalogProductVariantKind(product, variantKind) {
    if (product?.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
      return Promise.resolve(false);
    }
    return runCatalogMutation(() => updateCanonicalVariantGroup(
      product.variantGroupId,
      product.constructionItemId,
      { variant_kind: `${variantKind ?? ""}`.trim() }
    ), "옵션 구분을 수정하지 못했습니다.");
  }

  function archiveCatalogProductVariant(product, variant) {
    if (
      product?.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
      || !variant?.constructionSubitemId
    ) return Promise.resolve(false);
    return runCatalogMutation(() => (
      (product.variants ?? []).length <= 1
        ? archiveCanonicalVariantGroup(product.variantGroupId, product.constructionItemId)
        : archiveCanonicalConstructionSubitem(
            variant.constructionSubitemId,
            product.constructionItemId
          )
    ), "제품 옵션을 보관하지 못했습니다.");
  }

  return {
    companyId,
    createPhotoId,
    getFriendlyError,
    photoCatalog,
    photoCatalogLoading,
    photoCatalogSaving,
    photoCatalogError,
    renameCatalogProduct,
    createCatalogProductVariant,
    addCatalogProductVariant,
    updateCatalogProductVariant,
    updateCatalogProductVariantKind,
    archiveCatalogProductVariant,
    refresh,
    reset,
  };
}
