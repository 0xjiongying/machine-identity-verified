import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Section, Shell, Eyebrow, Heading, Lede, Reveal, StatusDot } from "@/components/primitives";
import { useCleanverse } from "@/lib/cleanverse-state";
import type { CviCredential } from "@/data/cleanverse-registry";
import { cn } from "@/lib/utils";

function Row({ k, v, tone }: { k: string; v: string; tone?: "ok" | "fail" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="mt-label">{k}</span>
      <span
        className={cn(
          "mt-mono text-right text-[11px]",
          tone === "ok" ? "text-success" : tone === "fail" ? "text-destructive" : "",
        )}
      >
        {v}
      </span>
    </div>
  );
}

function RawToggle({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-cursor="open"
        className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {open ? "Hide credential" : "Inspect credential"}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-mono mt-3 overflow-x-auto border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground"
          >
            {JSON.stringify(value, null, 2)}
          </motion.pre>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CviCard({ credential, onToggle }: { credential: CviCredential; onToggle?: () => void }) {
  const absent = credential.status === "absent";
  const active = credential.status === "active";
  return (
    <div className="border border-border bg-surface/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mt-label">{credential.holder.role}</p>
          <p className="mt-1.5 truncate text-[15px]">{credential.holder.name}</p>
        </div>
        <span
          className={cn(
            "mt-mono flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.18em]",
            active ? "text-success" : "text-destructive",
          )}
        >
          <StatusDot tone={active ? "ok" : "fail"} /> {credential.status}
        </span>
      </div>

      <div className="mt-4">
        <Row k="Credential" v={credential.id} />
        <Row k="Subject DID" v={credential.holder.did} />
        <Row k="Jurisdiction" v={credential.jurisdiction} />
        <Row k="Verification tier" v={`tier ${credential.kycTier}`} />
        <Row k="Accreditation" v={credential.accreditation} />
        <Row k="Valid until" v={credential.expiresAt} />
      </div>

      {absent ? (
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          No credential exists for this wallet. Machine Trust cannot resolve a legal entity, so
          every policy that requires a holder identity fails closed.
        </p>
      ) : (
        <RawToggle value={credential} />
      )}

      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          data-cursor="select"
          className="mt-5 w-full border border-border px-4 py-2.5 text-[12px] transition-colors hover:border-foreground"
        >
          {active ? "Simulate revoke (DEMO preview only)" : "Restore fixture (DEMO preview only)"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Credential control surface. Everything here is an input to the policy engine:
 * revoke an identity or expire an attestation and the issuance and transfer
 * flows change their decisions immediately.
 */
export function Credentials() {
  const {
    issuer,
    counterparties,
    asset,
    mode,
    decisions,
    setCounterpartyStatus,
    setAttestationStatus,
    setAssetStatus,
  } = useCleanverse();

  const fund = counterparties.find((c) => c.holder.name === "Equipment Fund B");

  return (
    <Section id="credentials" label="Cleanverse credentials" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="07">Cleanverse credentials</Eyebrow>
          <Heading>CVI verifies the party. CVA verifies the asset.</Heading>
          <Lede>
            Issuer and buyer wallets map to Cleanverse A-Pass checks. In{" "}
            <strong className="font-medium text-foreground">SANDBOX</strong> mode, live{" "}
            <code>query_apass</code> / <code>verify_apass</code> decide — local toggles only affect
            DEMO preview grading.
          </Lede>
          <p className="mt-mono mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Adapter mode: {mode === "live" ? "SANDBOX" : "DEMO"} · issuer wallet shown below is the
            issuance CVI subject
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <Reveal>
            <div className="mb-2">
              <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                Issuer · CVI gate for issuance
              </p>
            </div>
            <CviCard credential={issuer} />
          </Reveal>
          {counterparties.map((c, i) => (
            <Reveal key={c.id} delay={0.08 * (i + 1)}>
              <div className="mb-2">
                <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Buyer · transfer counterparty
                </p>
              </div>
              <CviCard
                credential={c}
                {...(c.status === "absent" || mode === "live"
                  ? {}
                  : {
                      onToggle: () =>
                        setCounterpartyStatus(c.id, c.status === "active" ? "revoked" : "active"),
                    })}
              />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-6 border border-border bg-surface/50 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mt-label">Asset credential · CVA</p>
                <p className="mt-1.5 text-[15px]">{asset.subject.passportId}</p>
                <p className="mt-mono mt-1 text-[11px] text-muted-foreground">
                  {asset.subject.assetClass}
                </p>
              </div>
              {mode === "demo" ? (
                <button
                  type="button"
                  onClick={() => setAssetStatus(asset.status === "active" ? "suspended" : "active")}
                  data-cursor="select"
                  className="mt-mono border border-border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-foreground"
                >
                  {asset.status === "active"
                    ? "Simulate suspend (DEMO)"
                    : "Reinstate fixture (DEMO)"}
                </button>
              ) : (
                <p className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  SANDBOX · CVA from Cleanverse bind
                </p>
              )}
            </div>

            <ul className="mt-6 grid gap-px bg-border sm:grid-cols-3">
              {asset.attestations.map((a) => {
                const valid = a.status === "valid";
                return (
                  <li key={a.code} className="bg-background px-4 py-4">
                    <p className="mt-label">{a.label}</p>
                    <p className="mt-mono mt-1.5 text-[11px] text-muted-foreground">{a.attestor}</p>
                    <p
                      className={cn(
                        "mt-mono mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em]",
                        valid ? "text-success" : "text-destructive",
                      )}
                    >
                      <StatusDot tone={valid ? "ok" : "fail"} /> {a.status} · {a.validUntil}
                    </p>
                    {mode === "demo" ? (
                      <button
                        type="button"
                        onClick={() => setAttestationStatus(a.code, valid ? "expired" : "valid")}
                        data-cursor="select"
                        className="mt-3 w-full border border-border px-3 py-2 text-[11px] transition-colors hover:border-foreground"
                      >
                        {valid ? "Expire (DEMO preview)" : "Renew (DEMO preview)"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 grid gap-px bg-border sm:grid-cols-3">
              <div className="bg-background px-4 py-4">
                <p className="mt-label">Allowed jurisdictions</p>
                <p className="mt-mono mt-1.5 text-[11px]">
                  {asset.restrictions.allowedJurisdictions.join(" · ")}
                </p>
              </div>
              <div className="bg-background px-4 py-4">
                <p className="mt-label">Minimum CVI tier</p>
                <p className="mt-mono mt-1.5 text-[11px]">{asset.restrictions.minKycTier}</p>
              </div>
              <div className="bg-background px-4 py-4">
                <p className="mt-label">Eligible holders</p>
                <p className="mt-mono mt-1.5 text-[11px]">
                  {asset.restrictions.allowedAccreditation.join(" · ")}
                </p>
              </div>
            </div>

            <RawToggle value={asset} />

            {fund ? (
              <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
                {mode === "demo"
                  ? `DEMO: toggle ${fund.holder.name}'s fixture, then run transfer — local CCP preview changes.`
                  : `SANDBOX: transfer uses live verify_apass on wallet ${fund.holder.wallet.slice(0, 10)}… — fixture toggles are disabled.`}
              </p>
            ) : null}
          </div>
        </Reveal>

        {decisions.length ? (
          <Reveal delay={0.1}>
            <div className="mt-6 border border-border bg-surface/50 p-5">
              <p className="mt-label">Decision log</p>
              <ul className="mt-3">
                {decisions.map((d) => (
                  <li
                    key={`${d.decisionId}-${d.evaluatedAt}`}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                  >
                    <span className="mt-mono text-[11px] text-muted-foreground">
                      {d.decisionId} · {d.kind} · {d.policyId}
                    </span>
                    <span
                      className={cn(
                        "mt-mono text-[11px] uppercase tracking-[0.16em]",
                        d.approved ? "text-success" : "text-destructive",
                      )}
                    >
                      {d.approved ? "approved" : `blocked · ${d.blockedBy}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </Shell>
    </Section>
  );
}
