const ACTIVE = (row) => !row?.archived_at && !row?.archivedAt;
const idOf = (value) => `${value ?? ""}`.trim();
const textKey = (value) => `${value ?? ""}`.trim().toLocaleLowerCase("en-US");

function finiteNumber(value) {
  if (value === null || value === undefined || `${value}`.trim() === "") return null;
  const number = Number(`${value}`.replaceAll(",", ""));
  return Number.isFinite(number) ? number : null;
}

function almostEqual(left, right, tolerance = 0.01) {
  return Math.abs(left - right) <= tolerance;
}

function hasValue(row, key) {
  return row?.[key] !== null && row?.[key] !== undefined;
}

function table(dataset, ...keys) {
  for (const key of keys) {
    if (Array.isArray(dataset?.[key])) return dataset[key];
  }
  return [];
}

function createReporter() {
  const issues = [];
  return {
    issues,
    add(code, entityType, entityId, message, context = {}, severity = "error") {
      issues.push({
        code,
        severity,
        entityType,
        entityId: idOf(entityId) || null,
        message,
        context,
      });
    },
  };
}

function getEstimateItems(itemsData) {
  if (Array.isArray(itemsData)) return itemsData;
  return Array.isArray(itemsData?.items) ? itemsData.items : [];
}

function getEstimateAdjustmentTotal(itemsData) {
  if (!Array.isArray(itemsData?.adjustments)) return 0;
  return itemsData.adjustments.reduce((sum, adjustment) => {
    const amount = finiteNumber(adjustment?.amount) ?? 0;
    return sum + (adjustment?.type === "discount" ? -amount : amount);
  }, 0);
}

function checkEstimate(reporter, estimate) {
  const itemsData = estimate?.items_data;
  const databaseTotal = finiteNumber(estimate?.total_amount);
  if (databaseTotal === null || databaseTotal < 0) {
    reporter.add(
      "estimate-invalid-total",
      "estimate",
      estimate?.id,
      "Estimate total_amount must be a non-negative number."
    );
    return;
  }

  if (itemsData && !Array.isArray(itemsData) && typeof itemsData === "object") {
    const snapshotTotal = finiteNumber(itemsData.finalTotal);
    if (Object.hasOwn(itemsData, "finalTotal") && snapshotTotal === null) {
      reporter.add(
        "estimate-invalid-snapshot-total",
        "estimate",
        estimate?.id,
        "Current items_data.finalTotal must be numeric."
      );
    } else if (snapshotTotal !== null && !almostEqual(snapshotTotal, databaseTotal)) {
      reporter.add(
        "estimate-snapshot-total-mismatch",
        "estimate",
        estimate?.id,
        "items_data.finalTotal differs from estimates.total_amount.",
        { databaseTotal, snapshotTotal }
      );
    }
  }

  const items = getEstimateItems(itemsData);
  const totals = items.map((item) => finiteNumber(
    item?.totalAmount ?? item?.price ?? item?.amount
  ));
  if (items.length && totals.every((value) => value !== null)) {
    const calculatedItemsTotal = totals.reduce((sum, value) => sum + value, 0);
    const adjustmentTotal = Array.isArray(itemsData)
      ? 0
      : getEstimateAdjustmentTotal(itemsData);
    const calculatedFinalTotal = Math.max(0, calculatedItemsTotal + adjustmentTotal);

    if (!Array.isArray(itemsData)) {
      const storedItemsTotal = finiteNumber(itemsData.selectedItemsTotal);
      const storedAdjustmentTotal = finiteNumber(itemsData.adjustmentTotal);
      if (storedItemsTotal !== null && !almostEqual(storedItemsTotal, calculatedItemsTotal)) {
        reporter.add(
          "estimate-items-total-mismatch",
          "estimate",
          estimate?.id,
          "items_data.selectedItemsTotal differs from the saved item totals.",
          { calculatedItemsTotal, storedItemsTotal }
        );
      }
      if (storedAdjustmentTotal !== null && !almostEqual(storedAdjustmentTotal, adjustmentTotal)) {
        reporter.add(
          "estimate-adjustment-total-mismatch",
          "estimate",
          estimate?.id,
          "items_data.adjustmentTotal differs from the saved adjustments.",
          { adjustmentTotal, storedAdjustmentTotal }
        );
      }
    }

    if (!almostEqual(calculatedFinalTotal, databaseTotal)) {
      reporter.add(
        "estimate-calculated-total-mismatch",
        "estimate",
        estimate?.id,
        "Saved item and adjustment totals do not reproduce estimates.total_amount.",
        { calculatedFinalTotal, databaseTotal }
      );
    }
  }
}

export function checkFormateDataIntegrity(dataset = {}, { companyId = "" } = {}) {
  const reporter = createReporter();
  const allItems = table(dataset, "constructionItems", "construction_items");
  const allSubitems = table(dataset, "constructionSubitems", "construction_subitems");
  const allGroups = table(dataset, "variantGroups", "construction_subitem_variant_groups");
  const allTemplates = table(dataset, "templates", "admin_condition_templates");
  const allTemplateValues = table(dataset, "templateValues", "admin_condition_template_values");
  const allDetailCosts = table(dataset, "detailCosts", "detail_cost_categories");
  const allPhotos = table(dataset, "photos");
  const allPhotoCollections = table(dataset, "photoCollections", "photo_collections");
  const allFolders = table(dataset, "photoLibraryFolders", "photo_library_folders");
  const allSashEntries = table(dataset, "sashCatalogEntries", "sash_catalog_entries");
  const allEstimates = table(dataset, "estimates");
  const allPriceConditions = table(dataset, "priceConditions", "price_conditions");
  const storageObjects = table(dataset, "storageObjects", "storage_objects");
  const hasStorageSnapshot = Array.isArray(dataset?.storageObjects)
    || Array.isArray(dataset?.storage_objects);

  const itemsById = new Map(allItems.map((row) => [idOf(row?.id), row]));
  const subitemsById = new Map(allSubitems.map((row) => [idOf(row?.id), row]));
  const groupsById = new Map(allGroups.map((row) => [idOf(row?.id), row]));
  const templatesById = new Map(allTemplates.map((row) => [idOf(row?.id), row]));
  const foldersById = new Map(allFolders.map((row) => [idOf(row?.id), row]));
  const photosById = new Map(allPhotos.map((row) => [idOf(row?.id), row]));
  const photoCollectionsById = new Map(allPhotoCollections.map((row) => [idOf(row?.id), row]));
  const sashById = new Map(allSashEntries.map((row) => [idOf(row?.id), row]));
  const priceConditionsById = new Map(allPriceConditions.map((row) => [idOf(row?.id), row]));
  const inCompany = (row) => !companyId || idOf(row?.company_id) === companyId;
  const selectedItems = allItems.filter(inCompany);
  const selectedItemIds = new Set(selectedItems.map((row) => idOf(row.id)));
  const selectedSubitems = companyId
    ? allSubitems.filter((row) => selectedItemIds.has(idOf(row?.item_id)))
    : allSubitems;
  const selectedGroups = companyId
    ? allGroups.filter((row) => selectedItemIds.has(idOf(row?.construction_item_id)))
    : allGroups;
  const selectedTemplates = allTemplates.filter(inCompany);
  const selectedTemplateIds = new Set(selectedTemplates.map((row) => idOf(row.id)));
  const selectedTemplateValues = companyId
    ? allTemplateValues.filter((row) => selectedTemplateIds.has(idOf(row?.template_id)))
    : allTemplateValues;
  const selectedPhotos = allPhotos.filter(inCompany);
  const selectedFolders = allFolders.filter(inCompany);
  const selectedSashEntries = allSashEntries.filter(inCompany);
  const selectedDetailCosts = allDetailCosts.filter(inCompany);
  const selectedEstimates = allEstimates.filter(inCompany);

  const baseOwnerBySubitemId = new Map();
  for (const group of selectedGroups) {
    const groupId = idOf(group?.id);
    const item = itemsById.get(idOf(group?.construction_item_id));
    const valueType = textKey(group?.variant_value_type);
    if (!groupId || !item || !`${group?.display_name ?? ""}`.trim()
      || !`${group?.variant_kind ?? ""}`.trim()
      || !["number", "text"].includes(valueType)) {
      reporter.add(
        "incomplete-variant-group-metadata",
        "variant-group",
        groupId,
        "Variant group is missing required stable metadata.",
        { constructionItemId: idOf(group?.construction_item_id), valueType }
      );
    }

    const baseSubitemId = idOf(group?.base_subitem_id);
    if (baseSubitemId) {
      const base = subitemsById.get(baseSubitemId);
      const previousOwner = baseOwnerBySubitemId.get(baseSubitemId);
      const baseHasVariantMetadata = Boolean(
        idOf(base?.variant_group_id)
        || hasValue(base, "variant_value")
        || hasValue(base, "variant_value_text")
        || hasValue(base, "variant_unit")
      );
      if (!base || idOf(base.item_id) !== idOf(group.construction_item_id) || baseHasVariantMetadata || previousOwner) {
        reporter.add(
          "invalid-variant-group-base-relation",
          "variant-group",
          groupId,
          "Variant group base_subitem_id is missing, cross-item, variant-bearing, or shared.",
          { baseSubitemId, previousOwner: previousOwner ?? null }
        );
      } else {
        baseOwnerBySubitemId.set(baseSubitemId, groupId);
      }
    }
  }

  const activeIdentityOwners = new Map();
  for (const subitem of selectedSubitems) {
    const subitemId = idOf(subitem?.id);
    const groupId = idOf(subitem?.variant_group_id);
    const hasNumber = hasValue(subitem, "variant_value");
    const hasText = hasValue(subitem, "variant_value_text");
    const hasUnit = hasValue(subitem, "variant_unit");
    const hasAnyMetadata = Boolean(groupId || hasNumber || hasText || hasUnit);
    if (!hasAnyMetadata) continue;

    const group = groupsById.get(groupId);
    const groupType = textKey(group?.variant_value_type);
    const numericValue = finiteNumber(subitem?.variant_value);
    const textValue = `${subitem?.variant_value_text ?? ""}`.trim();
    const unit = `${subitem?.variant_unit ?? ""}`.trim();
    const validShape = Boolean(groupId && (hasNumber !== hasText))
      && (hasNumber ? numericValue !== null && Boolean(unit) : Boolean(textValue) && (!hasUnit || Boolean(unit)));
    if (!validShape) {
      reporter.add(
        "incomplete-variant-metadata",
        "construction-subitem",
        subitemId,
        "Construction subitem variant metadata is incomplete or ambiguous.",
        { groupId, hasNumber, hasText, unit }
      );
      continue;
    }
    if (!group || idOf(group.construction_item_id) !== idOf(subitem.item_id)) {
      reporter.add(
        "invalid-variant-group-relation",
        "construction-subitem",
        subitemId,
        "Variant group is missing or belongs to a different construction item.",
        { groupId, constructionItemId: idOf(subitem.item_id) }
      );
      continue;
    }
    const rowType = hasNumber ? "number" : "text";
    if (rowType !== groupType) {
      reporter.add(
        "variant-value-type-mismatch",
        "construction-subitem",
        subitemId,
        "Variant value representation differs from its group contract.",
        { groupId, groupType, rowType }
      );
    }
    if (ACTIVE(subitem)) {
      const identity = hasNumber
        ? `${groupId}:number:${numericValue}:${textKey(unit)}`
        : `${groupId}:text:${textKey(textValue)}:${textKey(unit)}`;
      const previousOwner = activeIdentityOwners.get(identity);
      if (previousOwner) {
        reporter.add(
          "duplicate-active-variant-identity",
          "construction-subitem",
          subitemId,
          "Two active variants share one canonical group/value/unit identity.",
          { identity, previousOwner }
        );
      } else {
        activeIdentityOwners.set(identity, subitemId);
      }
    }
  }

  const templateIdentityOwners = new Map();
  for (const value of selectedTemplateValues) {
    const valueId = idOf(value?.id);
    const template = templatesById.get(idOf(value?.template_id));
    const item = itemsById.get(idOf(value?.item_id));
    const subitem = subitemsById.get(idOf(value?.subitem_id));
    if (!template || !item || !subitem
      || idOf(subitem.item_id) !== idOf(item.id)
      || idOf(item.company_id) !== idOf(template.company_id)) {
      reporter.add(
        "template-subitem-mismatch",
        "template-value",
        valueId,
        "Template value item/subitem/company scope is inconsistent.",
        {
          templateId: idOf(value?.template_id),
          itemId: idOf(value?.item_id),
          subitemId: idOf(value?.subitem_id),
        }
      );
    }
    const identity = `${idOf(value?.template_id)}:${idOf(value?.subitem_id)}`;
    const previousOwner = templateIdentityOwners.get(identity);
    if (previousOwner) {
      reporter.add(
        "duplicate-template-subitem-identity",
        "template-value",
        valueId,
        "Template has more than one value row for one construction_subitem UUID.",
        { identity, previousOwner }
      );
    } else {
      templateIdentityOwners.set(identity, valueId);
    }
    if (`${value?.option_value ?? ""}` !== "") {
      reporter.add(
        "legacy-template-option-identity",
        "template-value",
        valueId,
        "Canonical Template value retains non-empty legacy option_value.",
        { optionValue: value.option_value }
      );
    }
    const quantity = finiteNumber(value?.quantity);
    const laborCount = finiteNumber(value?.labor_count);
    const constructionDays = finiteNumber(value?.construction_days);
    if ((hasValue(value, "quantity") && (quantity === null || quantity < 0))
      || (hasValue(value, "labor_count") && (laborCount === null || laborCount < 0))
      || constructionDays === null
      || constructionDays < 0
      || !Number.isInteger(constructionDays)) {
      reporter.add(
        "invalid-template-value",
        "template-value",
        valueId,
        "Template quantity, labor count, and construction days must be finite and non-negative."
      );
    }
  }

  for (const folder of selectedFolders) {
    const folderId = idOf(folder?.id);
    const parentId = idOf(folder?.parent_folder_id);
    if (parentId && idOf(foldersById.get(parentId)?.company_id) !== idOf(folder?.company_id)) {
      reporter.add(
        "photo-folder-parent-scope-mismatch",
        "photo-folder",
        folderId,
        "Photo Library parent folder is missing or cross-company.",
        { parentFolderId: parentId }
      );
    }
    const coverId = idOf(folder?.cover_photo_id);
    if (coverId) {
      const cover = photosById.get(coverId);
      if (!cover || idOf(cover.company_id) !== idOf(folder.company_id)
        || idOf(cover.photo_library_folder_id) !== folderId || !ACTIVE(cover)) {
        reporter.add(
          "photo-folder-cover-scope-mismatch",
          "photo-folder",
          folderId,
          "Photo Library cover is missing, archived, cross-company, or in another folder.",
          { coverPhotoId: coverId }
        );
      }
    }
  }

  for (const sash of selectedSashEntries) {
    const sashId = idOf(sash?.id);
    const subitem = subitemsById.get(idOf(sash?.construction_subitem_id));
    const item = itemsById.get(idOf(subitem?.item_id));
    if (!subitem
      || !item
      || idOf(item.company_id) !== idOf(sash?.company_id)
      || item.item_kind !== "sash") {
      reporter.add(
        "sash-catalog-subitem-scope-mismatch",
        "sash-catalog-entry",
        sashId,
        "Sash catalog entry is missing its subitem or differs from company/item_kind scope.",
        { constructionSubitemId: idOf(sash?.construction_subitem_id) }
      );
    }
  }

  for (const detailCost of selectedDetailCosts) {
    const detailCostId = idOf(detailCost?.id);
    const subitem = subitemsById.get(idOf(detailCost?.subitem_id));
    const item = itemsById.get(idOf(subitem?.item_id));
    if (!subitem || !item || idOf(item.company_id) !== idOf(detailCost?.company_id)) {
      reporter.add(
        "detail-cost-subitem-scope-mismatch",
        "detail-cost",
        detailCostId,
        "Detail cost is missing its construction subitem or differs from company scope.",
        { constructionSubitemId: idOf(detailCost?.subitem_id) }
      );
    }
  }

  const metadataPaths = new Set();
  for (const photo of selectedPhotos) {
    const photoId = idOf(photo?.id);
    const company = idOf(photo?.company_id);
    const targetType = idOf(photo?.target_type);
    const targetId = idOf(photo?.target_id);
    const photoType = idOf(photo?.photo_type);
    const subitemId = idOf(photo?.construction_subitem_id);
    const folderId = idOf(photo?.photo_library_folder_id);
    const sashId = idOf(photo?.sash_catalog_entry_id);
    const collectionId = idOf(photo?.collection_id);
    const storagePath = idOf(photo?.storage_path);
    if (photoType !== targetType) {
      reporter.add("photo-type-scope-mismatch", "photo", photoId, "photo_type differs from target_type.", { photoType, targetType });
    }
    if (idOf(photo?.storage_bucket) !== "formate-photos" || !storagePath.startsWith(`${company}/`)) {
      reporter.add(
        "photo-storage-scope-mismatch",
        "photo",
        photoId,
        "Photo Storage bucket/path does not match the owning company.",
        { storageBucket: photo?.storage_bucket, storagePath, companyId: company }
      );
    }
    if (storagePath) metadataPaths.add(storagePath);

    if (collectionId) {
      const collection = photoCollectionsById.get(collectionId);
      if (!collection
        || idOf(collection.company_id) !== company
        || idOf(collection.photo_type) !== photoType) {
        reporter.add(
          "photo-collection-scope-mismatch",
          "photo",
          photoId,
          "Photo collection is missing or differs from company/photo type scope.",
          { collectionId, photoType }
        );
      }
    }

    if (folderId) {
      const folder = foldersById.get(folderId);
      if (!folder || idOf(folder.company_id) !== company
        || photoType !== "photo_library" || targetType !== "photo_library" || targetId !== folderId) {
        reporter.add(
          "photo-folder-scope-mismatch",
          "photo",
          photoId,
          "Photo Library metadata does not resolve to one same-company folder UUID.",
          { folderId, targetId }
        );
      }
    } else if (photoType === "photo_library" || targetType === "photo_library") {
      reporter.add("photo-folder-scope-mismatch", "photo", photoId, "Photo Library row has no folder UUID.");
    }

    if (subitemId) {
      const subitem = subitemsById.get(subitemId);
      const item = itemsById.get(idOf(subitem?.item_id));
      if (!subitem || idOf(item?.company_id) !== company || targetType !== "subitem" || targetId !== subitemId) {
        reporter.add(
          "photo-subitem-scope-mismatch",
          "photo",
          photoId,
          "Photo subitem FK/target/company scope is inconsistent.",
          { subitemId, targetId }
        );
      }
    }
    if (photo?.pyeong !== null && photo?.pyeong !== undefined && !subitemId) {
      reporter.add("photo-pyeong-without-subitem", "photo", photoId, "Pyeong Photo has no construction_subitem UUID.");
    }
    if (sashId) {
      const sash = sashById.get(sashId);
      if (!sash || idOf(sash.company_id) !== company || idOf(sash.construction_subitem_id) !== subitemId) {
        reporter.add(
          "photo-sash-scope-mismatch",
          "photo",
          photoId,
          "Photo sash FK does not match company and construction_subitem UUID.",
          { sashId, subitemId }
        );
      }
    }
  }

  if (hasStorageSnapshot) {
    const objectPaths = new Set(storageObjects.map((entry) => idOf(
      typeof entry === "string" ? entry : entry?.name ?? entry?.path
    )).filter(Boolean));
    for (const path of metadataPaths) {
      if (!objectPaths.has(path)) {
        reporter.add(
          "photo-storage-object-missing",
          "storage-object",
          path,
          "Photo metadata points to a missing Storage object."
        );
      }
    }
    const companyPrefix = companyId ? `${companyId}/` : "";
    for (const path of objectPaths) {
      if ((!companyPrefix || path.startsWith(companyPrefix)) && !metadataPaths.has(path)) {
        reporter.add(
          "possible-photo-storage-orphan",
          "storage-object",
          path,
          "Storage object has no matching Photo metadata row.",
          {},
          "warning"
        );
      }
    }
  }

  for (const estimate of selectedEstimates) {
    const conditionId = idOf(estimate?.condition_id);
    if (conditionId) {
      const priceCondition = priceConditionsById.get(conditionId);
      if (!priceCondition
        || idOf(priceCondition.company_id) !== idOf(estimate?.company_id)) {
        reporter.add(
          "estimate-condition-company-mismatch",
          "estimate",
          estimate?.id,
          "Estimate condition_id is missing or belongs to another company.",
          { conditionId, estimateCompanyId: idOf(estimate?.company_id) }
        );
      }
    }
    const snapshotCompanyId = idOf(estimate?.condition_snapshot?.company_id);
    if (snapshotCompanyId && snapshotCompanyId !== idOf(estimate?.company_id)) {
      reporter.add(
        "estimate-snapshot-company-mismatch",
        "estimate",
        estimate?.id,
        "Estimate condition snapshot company differs from the owning estimate.",
        { snapshotCompanyId, estimateCompanyId: idOf(estimate?.company_id) }
      );
    }
    checkEstimate(reporter, estimate);
  }

  const counts = {
    constructionItems: selectedItems.length,
    constructionSubitems: selectedSubitems.length,
    variantGroups: selectedGroups.length,
    templates: selectedTemplates.length,
    templateValues: selectedTemplateValues.length,
    photos: selectedPhotos.length,
    photoLibraryFolders: selectedFolders.length,
    photoCollections: allPhotoCollections.filter(inCompany).length,
    sashCatalogEntries: selectedSashEntries.length,
    detailCosts: selectedDetailCosts.length,
    estimates: selectedEstimates.length,
    priceConditions: allPriceConditions.filter(inCompany).length,
    storageObjects: storageObjects.length,
  };
  return {
    ok: reporter.issues.length === 0,
    counts,
    issues: reporter.issues.sort((left, right) => (
      left.severity.localeCompare(right.severity)
      || left.code.localeCompare(right.code)
      || `${left.entityId}`.localeCompare(`${right.entityId}`)
    )),
  };
}
