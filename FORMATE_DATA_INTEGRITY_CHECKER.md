# FORMATE data integrity checker

The checker is read-only. It audits canonical catalog, DetailCosts, Template,
Photo/Storage, and Estimate relations and exits non-zero when it finds an issue.

Windows PowerShell, repository root:

```powershell
$env:FORMATE_INTEGRITY_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:FORMATE_INTEGRITY_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
npm.cmd run check:data-integrity
```

Limit the report to one company while still loading referenced rows needed to
detect cross-company relations:

```powershell
npm.cmd run check:data-integrity -- --company COMPANY_UUID
```

Storage enumeration can be skipped when only relational checks are needed:

```powershell
npm.cmd run check:data-integrity -- --company COMPANY_UUID --skip-storage
```

Never expose the service-role key through a `VITE_` variable or browser code.
For repository-only validation without live credentials:

```powershell
npm.cmd run check:data-integrity -- --fixture scripts/fixtures/canonical-integrity.valid.json
```

Exit codes: `0` means no findings, `1` means integrity findings, and `2` means
the checker itself could not complete.

## Deployment gate

1. Run the live checker and the read-only SQL preflight. Record the exact
   non-empty Template `option_value` row UUIDs/count and stop on any duplicate
   canonical identity or scope mismatch.
2. Apply `supabase/canonical_variant_stability_rpc_bootstrap.sql`. This adds the
   canonical Template unique index and frontend RPCs while retaining the legacy
   `option_value` index and write compatibility.
3. Deploy the new frontend and smoke-test PriceTable, Template, Estimate, Photo,
   DetailCosts, and sash atomic writes. Do not continue until this deployment is
   accepted; the old frontend remains rollback-safe only through this step.
4. Apply `supabase/canonical_variant_stability_guards.sql` in full.
5. Populate the approved UUIDs/count in
   `supabase/canonical_variant_legacy_template_option_cleanup.sql`, review the
   resulting diff, and run it once. The unchanged file intentionally aborts.
6. Run the live checker again. Use `--skip-storage` to verify relational
   integrity separately when known Storage orphan warnings remain under manual
   review.

Do not deploy the new frontend before the compatibility bootstrap. Do not apply
the full stability guards while the old frontend is still active. Neither SQL
file guesses or converts legacy identity data; every preflight disagreement
must stop the rollout.
