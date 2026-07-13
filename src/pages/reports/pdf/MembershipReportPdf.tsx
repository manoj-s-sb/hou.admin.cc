import React from 'react';

import { Circle, Document, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';

import type { PdfCountry, PdfReportData } from './reportPdfData';

const C = {
  headerBlue: '#0C447C',
  green: '#1baf7a',
  amber: '#eda100',
  red: '#e34948',
  gray: '#6b7280',
  border: '#e5e7eb',
  ink: '#111827',
  sub: '#6b7280',
  lightBlue: '#bcd3ef',
};

const rateColor = (r: number) => (r >= 75 ? C.green : r >= 60 ? C.amber : C.red);

// status-card tints
const TINT: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: '#eafaf3', border: '#a7e8cd', text: C.green },
  inactive: { bg: '#f3f4f6', border: '#d1d5db', text: C.gray },
  suspended: { bg: '#fdf6e6', border: '#f3d998', text: C.amber },
  expired: { bg: '#fdeceb', border: '#f4b5b2', text: C.red },
};

const s = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingVertical: 20, fontFamily: 'Helvetica', fontSize: 10, color: C.ink },

  // 1. header
  header: {
    backgroundColor: C.headerBlue,
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    alignSelf: 'flex-start',
    color: C.headerBlue,
    backgroundColor: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  hTitle: { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  hSub: { color: C.lightBlue, fontSize: 10, marginTop: 3 },
  hMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  hMetaLabel: { color: C.lightBlue, fontSize: 8 },
  hMetaVal: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold', marginLeft: 4 },

  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 6 },

  // 2. KPI strip
  kpiStrip: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 6, marginTop: 14 },
  kpiCol: { flex: 1, padding: 10, borderRightWidth: 1, borderRightColor: C.border },
  kpiColLast: { flex: 1, padding: 10 },
  kpiLabel: { fontSize: 7, letterSpacing: 0.6, color: C.sub, fontFamily: 'Helvetica-Bold' },
  kpiNum: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 3 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  deltaTxt: { fontSize: 7, marginLeft: 3, color: C.sub },

  // 3. status cards
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statusCard: { flex: 1, borderWidth: 1, borderRadius: 6, padding: 10 },
  statusLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  statusNum: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  statusPct: { fontSize: 8, color: C.sub, marginTop: 1 },

  // 4. breakdown
  twoCol: { flexDirection: 'row', gap: 10, marginTop: 14 },
  card: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12 },
  cardTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  stackBar: { flexDirection: 'row', height: 12, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sq: { width: 8, height: 8, borderRadius: 2, marginRight: 6 },
  planName: { flex: 1, fontSize: 9, color: C.ink },
  planCount: { fontSize: 9, fontFamily: 'Helvetica-Bold', width: 34, textAlign: 'right' },
  planPct: { fontSize: 8, color: C.sub, width: 34, textAlign: 'right' },
  donutWrap: { flexDirection: 'row', alignItems: 'center' },
  legendCol: { marginLeft: 12, flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  legendName: { flex: 1, fontSize: 8.5, color: C.ink },
  legendCount: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },

  // 5. table
  table: { marginTop: 14, borderWidth: 1, borderColor: C.border, borderRadius: 6 },
  thead: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: C.border },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.sub, letterSpacing: 0.3, padding: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  trAlt: { backgroundColor: '#fbfcfe' },
  td: { fontSize: 11, padding: 6, color: C.ink },
  codeChip: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.gray,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginRight: 4,
  },
  badge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  progressTrack: { height: 6, backgroundColor: '#eef2f7', borderRadius: 3, flex: 1, marginRight: 4 },

  // 6. insights
  insightRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  insightCard: { flex: 1, borderWidth: 1, borderRadius: 6, padding: 12 },
  insightTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  insightBody: { fontSize: 8.5, color: C.ink, lineHeight: 1.4 },

  // 7. footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footTxt: { fontSize: 7, color: C.sub },
  pagePill: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: C.headerBlue,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});

// column widths (spec): Country 22, counts 10 each (×5=50), Active Rate 14, Plan Mix 8, Trend 6
const W = { country: '22%', count: '10%', rate: '14%', mix: '8%', trend: '6%' };

const Delta: React.FC<{ delta: number }> = ({ delta }) => {
  const color = delta > 0 ? C.green : delta < 0 ? C.red : C.gray;
  return (
    <View style={s.deltaRow}>
      <Svg height={6} width={7}>
        {delta > 0 ? (
          <Path d="M0,6 L3.5,0 L7,6 Z" fill={color} />
        ) : delta < 0 ? (
          <Path d="M0,0 L3.5,6 L7,0 Z" fill={color} />
        ) : (
          <Rect fill={color} height={1.6} width={7} y={2.2} />
        )}
      </Svg>
      <Text style={[s.deltaTxt, { color }]}>vs last period</Text>
    </View>
  );
};

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(...values, 1);
  return (
    <Svg height={16} width={38}>
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * 14);
        return <Rect key={i} fill={C.headerBlue} height={h} rx={1} width={5} x={i * 7.5} y={16 - h} />;
      })}
    </Svg>
  );
};

const Donut: React.FC<{ regions: PdfReportData['regions'] }> = ({ regions }) => {
  const total = regions.reduce((a, r) => a + r.count, 0) || 1;
  const cx = 45;
  const cy = 45;
  const r = 34;
  const xy = (deg: number): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180; // start at the top
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  let start = 0;
  return (
    <Svg height={90} width={90}>
      {regions.map((rg, i) => {
        const frac = rg.count / total;
        // A single region (or ~100%) can't be drawn as an arc — use a full ring.
        if (frac >= 0.999) {
          return <Circle key={i} cx="45" cy="45" fill="none" r="34" stroke={rg.color} strokeWidth="16" />;
        }
        const end = start + frac * 360;
        const [x0, y0] = xy(start);
        const [x1, y1] = xy(end);
        const large = end - start > 180 ? 1 : 0;
        const d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
        start = end;
        return <Path key={i} d={d} fill="none" stroke={rg.color} strokeWidth="16" />;
      })}
    </Svg>
  );
};

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <Text style={[s.badge, { color, borderColor: color, backgroundColor: `${color}18` }]}>{label}</Text>
);

const CountRow: React.FC<{ c: PdfCountry; alt: boolean; bold?: boolean }> = ({ c, alt, bold }) => {
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  return (
    <View style={[s.tr, alt ? s.trAlt : {}]}>
      <View style={[{ width: W.country, flexDirection: 'row', alignItems: 'center', padding: 6 }]}>
        {!bold && <Text style={s.codeChip}>{c.name.slice(0, 2).toUpperCase()}</Text>}
        <Text style={[{ fontSize: 11, fontFamily: font, color: C.ink }]}>{c.name}</Text>
      </View>
      <Text style={[s.td, { width: W.count, fontFamily: font }]}>{c.total.toLocaleString()}</Text>
      <Text style={[s.td, { width: W.count, fontFamily: font, color: C.green }]}>{c.active.toLocaleString()}</Text>
      <Text style={[s.td, { width: W.count, fontFamily: font }]}>{c.inactive.toLocaleString()}</Text>
      <Text style={[s.td, { width: W.count, fontFamily: font }]}>{c.suspended.toLocaleString()}</Text>
      <Text style={[s.td, { width: W.count, fontFamily: font }]}>{c.expired.toLocaleString()}</Text>
      <View style={[{ width: W.rate, flexDirection: 'row', alignItems: 'center', padding: 6 }]}>
        <View style={s.progressTrack}>
          <View
            style={{ height: 6, borderRadius: 3, width: `${c.activeRate}%`, backgroundColor: rateColor(c.activeRate) }}
          />
        </View>
        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: rateColor(c.activeRate) }}>
          {c.activeRate}%
        </Text>
      </View>
      <View style={[{ width: W.mix, padding: 6 }]}>
        {c.planMix.label !== '—' ? (
          <Badge color={c.planMix.color} label={c.planMix.label} />
        ) : (
          <Text style={s.td}>—</Text>
        )}
      </View>
      <View style={[{ width: W.trend, padding: 6 }]}>{!bold && <Sparkline values={c.trend} />}</View>
    </View>
  );
};

const MembershipReportPdf: React.FC<{ data: PdfReportData }> = ({ data }) => {
  const totalsRow: PdfCountry = {
    flag: '',
    name: 'All Regions',
    total: data.countries.reduce((a, c) => a + c.total, 0),
    active: data.countries.reduce((a, c) => a + c.active, 0),
    inactive: data.countries.reduce((a, c) => a + c.inactive, 0),
    suspended: data.countries.reduce((a, c) => a + c.suspended, 0),
    expired: data.countries.reduce((a, c) => a + c.expired, 0),
    activeRate: 0,
    planMix: { label: '—', color: C.gray },
    trend: [],
  };
  totalsRow.activeRate = totalsRow.total ? Math.round((totalsRow.active / totalsRow.total) * 100) : 0;

  const planTotal = data.plans.reduce((a, p) => a + p.count, 0) || 1;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* 1. Header band */}
        <View style={s.header}>
          <View>
            <Text style={s.pill}>MEMBERSHIP ANALYTICS</Text>
            <Text style={s.hTitle}>{data.title}</Text>
            <Text style={s.hSub}>{data.periodLabel} · Network-wide</Text>
          </View>
          <View>
            <View style={s.hMetaRow}>
              <Text style={s.hMetaLabel}>Generated</Text>
              <Text style={s.hMetaVal}>{data.generatedDate}</Text>
            </View>
            <View style={s.hMetaRow}>
              <Text style={s.hMetaLabel}>Exported by</Text>
              <Text style={s.hMetaVal}>{data.exportedBy}</Text>
            </View>
            <View style={s.hMetaRow}>
              <Text style={s.hMetaLabel}>Report ID</Text>
              <Text style={s.hMetaVal}>{data.reportId}</Text>
            </View>
          </View>
        </View>

        {/* 2. KPI strip */}
        <View style={s.kpiStrip}>
          {data.kpis.map((k, i) => (
            <View key={k.label} style={i === data.kpis.length - 1 ? s.kpiColLast : s.kpiCol}>
              <Text style={s.kpiLabel}>{k.label.toUpperCase()}</Text>
              <Text style={s.kpiNum}>{k.value.toLocaleString()}</Text>
              <Delta delta={k.delta} />
            </View>
          ))}
        </View>

        {/* 3. status cards */}
        <View style={s.statusRow}>
          {data.statuses.map(st => {
            const t = TINT[st.key];
            return (
              <View key={st.key} style={[s.statusCard, { backgroundColor: t.bg, borderColor: t.border }]}>
                <Text style={[s.statusLabel, { color: t.text }]}>{st.label}</Text>
                <Text style={[s.statusNum, { color: t.text }]}>{st.count.toLocaleString()}</Text>
                <Text style={s.statusPct}>{st.pct}% of total members</Text>
              </View>
            );
          })}
        </View>

        {/* 4. two-column breakdown */}
        <View style={s.twoCol}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Plan Type Distribution</Text>
            <View style={s.stackBar}>
              {data.plans.map(p => (
                <View key={p.name} style={{ width: `${(p.count / planTotal) * 100}%`, backgroundColor: p.color }} />
              ))}
            </View>
            {data.plans.map(p => (
              <View key={p.name} style={s.planRow}>
                <View style={[s.sq, { backgroundColor: p.color }]} />
                <Text style={s.planName}>{p.name}</Text>
                <Text style={s.planCount}>{p.count.toLocaleString()}</Text>
                <Text style={s.planPct}>{p.pct}%</Text>
              </View>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Members by Region</Text>
            <View style={s.donutWrap}>
              <Donut regions={data.regions} />
              <View style={s.legendCol}>
                {data.regions.map(r => (
                  <View key={r.name} style={s.legendRow}>
                    <View style={[s.sq, { backgroundColor: r.color }]} />
                    <Text style={s.legendName}>{r.name}</Text>
                    <Text style={s.legendCount}>{r.count.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 5. country summary table */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, { width: W.country }]}>COUNTRY</Text>
            <Text style={[s.th, { width: W.count }]}>TOTAL</Text>
            <Text style={[s.th, { width: W.count }]}>ACTIVE</Text>
            <Text style={[s.th, { width: W.count }]}>INACTIVE</Text>
            <Text style={[s.th, { width: W.count }]}>SUSP.</Text>
            <Text style={[s.th, { width: W.count }]}>EXPIRED</Text>
            <Text style={[s.th, { width: W.rate }]}>ACTIVE RATE</Text>
            <Text style={[s.th, { width: W.mix }]}>PLAN</Text>
            <Text style={[s.th, { width: W.trend }]}>TREND</Text>
          </View>
          {data.countries.map((c, i) => (
            <CountRow key={c.name} alt={i % 2 === 1} c={c} />
          ))}
          <CountRow bold alt={false} c={totalsRow} />
        </View>

        {/* 6. insight callouts */}
        <View style={s.insightRow}>
          <View style={[s.insightCard, { backgroundColor: '#eafaf3', borderColor: '#a7e8cd' }]}>
            <Text style={[s.insightTitle, { color: C.green }]}>▲ Strong Performers</Text>
            <Text style={s.insightBody}>{data.insights.top}</Text>
          </View>
          <View style={[s.insightCard, { backgroundColor: '#fdf6e6', borderColor: '#f3d998' }]}>
            <Text style={[s.insightTitle, { color: C.amber }]}>! Needs Attention</Text>
            <Text style={s.insightBody}>{data.insights.warn}</Text>
          </View>
        </View>

        {/* 7. footer */}
        <View fixed style={s.footer}>
          <Text style={s.footTxt}>Confidential · For internal use only · {data.periodLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={s.pagePill} />
        </View>
      </Page>
    </Document>
  );
};

export default MembershipReportPdf;
