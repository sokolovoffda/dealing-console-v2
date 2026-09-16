import {
  DIAGNOSTIC_PLATFORM,
  DIAGNOSTIC_SNAPSHOT_VERSION,
  diagnosticCategories,
  type DiagnosticCategory,
  type DiagnosticCategorySnapshot,
  type DiagnosticSnapshot,
} from './types'

const sortRecordsByTimestampDesc = (left: { timestamp: string }, right: { timestamp: string }) => {
  return Date.parse(right.timestamp) - Date.parse(left.timestamp)
}

const mergeCategoryRecords = (
  category: DiagnosticCategory,
  snapshots: DiagnosticSnapshot[],
): DiagnosticCategorySnapshot => {
  const records = snapshots
    .flatMap((snapshot) => snapshot.categories.find((item) => item.category === category)?.records ?? [])
    .sort(sortRecordsByTimestampDesc)

  return {
    category,
    records,
    total: records.length,
  }
}

export const mergeDiagnosticSnapshots = (...snapshots: DiagnosticSnapshot[]): DiagnosticSnapshot => {
  const availableSnapshots = snapshots.filter(Boolean)
  const [primarySnapshot] = availableSnapshots

  if (!primarySnapshot) {
    throw new Error('At least one diagnostic snapshot is required')
  }

  const metadata = availableSnapshots.reduce<DiagnosticSnapshot['metadata']>((acc, snapshot) => {
    const networkState = acc.networkState === 'online'
      ? acc.networkState
      : (snapshot.metadata.networkState ?? acc.networkState)

    return {
      appVersion: acc.appVersion || snapshot.metadata.appVersion,
      platform: acc.platform || snapshot.metadata.platform,
      collectedAt: acc.collectedAt > snapshot.metadata.collectedAt ? acc.collectedAt : snapshot.metadata.collectedAt,
      route: acc.route || snapshot.metadata.route,
      hostname: acc.hostname || snapshot.metadata.hostname,
      userLogin: acc.userLogin || snapshot.metadata.userLogin,
      userNumber: acc.userNumber || snapshot.metadata.userNumber,
      networkState,
    }
  }, {
    appVersion: '',
    platform: DIAGNOSTIC_PLATFORM,
    collectedAt: primarySnapshot.metadata.collectedAt,
    networkState: 'unknown',
  })

  return {
    version: DIAGNOSTIC_SNAPSHOT_VERSION,
    platform: DIAGNOSTIC_PLATFORM,
    period: primarySnapshot.period,
    metadata,
    categories: Object.values(diagnosticCategories).map((category) => mergeCategoryRecords(category, availableSnapshots)),
    artifacts: {
      networkHar: availableSnapshots.find((snapshot) => snapshot.artifacts.networkHar)?.artifacts.networkHar ?? null,
    },
  }
}
