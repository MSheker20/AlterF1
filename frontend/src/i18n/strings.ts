export const strings = {
  brand: 'AlterF1',
  page: {
    seasonHeading: (year: number) => `${year} season`,
    invalidSeasonTitle: 'Season not found',
    invalidSeasonDetail: (rawYear: string) =>
      `"${rawYear}" is not a valid Formula 1 season year.`,
    notFoundTitle: 'Page not found',
    notFoundDetail: 'The page you requested does not exist.',
    backToDefaultSeason: 'Go to 1988 season',
    backHome: 'Back to home',
    retry: 'Try again',
    genericErrorTitle: 'Could not load standings',
    genericErrorDetail: 'An unexpected error occurred while fetching season data.',
    viewLoadError: 'Could not load this view.',
    reload: 'Reload',
  },
  controls: {
    seasonLabel: 'Season',
    chooseSeasonPlaceholder: 'Choose a season',
    scoringSystemLabel: 'Scoring system',
    customSystemLabel: 'Custom',
    realSystemTooltip: 'Historical scoring system for this season',
    realSystemSrOnly: 'historical system',
    viewModeLabel: 'View mode',
    towerTab: 'Tower',
    compareTab: 'Compare',
  },
  tabs: {
    navAriaLabel: 'Season views',
    tower: 'Tower',
    compare: 'Compare',
    progression: 'Progression',
  },
  headline: {
    changedKicker: 'Champion changed',
    sameKicker: (season: number, systemId: string) =>
      `${season} · ${systemId === 'custom' ? 'Custom' : systemId} rules`,
    championChanges: (
      championSurname: string,
      championPoints: string,
      realChampionSurname: string,
      realChampionPoints: string,
    ) =>
      `Champion changes: ${championSurname} (${championPoints}) instead of ${realChampionSurname} (${realChampionPoints})`,
    sameChampion: (championSurname: string, championPoints: string) =>
      `Same champion: ${championSurname} (${championPoints})`,
    noChampion: 'No champion recorded for this season',
    activeScenarioChanges: (count: number) =>
      count === 1 ? 'With 1 scenario change' : `With ${count} scenario changes`,
    systemRules: (systemId: string, racePoints: readonly number[]) =>
      `${systemId === 'custom' ? 'Custom' : `${systemId} rules`} · ${racePoints.join('-')}`,
  },
  delta: {
    gained: (places: number) => `gained ${places} ${places === 1 ? 'place' : 'places'}`,
    lost: (places: number) => `lost ${places} ${places === 1 ? 'place' : 'places'}`,
    unchanged: 'position unchanged',
  },
  tower: {
    listAriaLabel: 'Driver standings',
    colPos: 'Pos',
    colDriver: 'Driver',
    colPoints: 'Pts',
    colChange: 'Δ',
    showAll: (total: number) => `Show all ${total} drivers`,
    showTop: (limit: number) => `Show top ${limit} drivers`,
    empty: 'No standings data available for this season.',
    rowPointsUnit: 'pts',
    expandHint: 'Show race results',
    collapseHint: 'Hide race results',
  },
  detail: {
    realLabel: (season: number) => `Real ${season}`,
    systemLabel: (systemId: string) =>
      systemId === 'custom' ? 'Custom rules' : `${systemId} rules`,
    winsLabel: 'Wins',
    podiumsLabel: 'Podiums',
    positionBadge: (pos: number) => `P${pos}`,
    unclassified: 'Unclassified',
    raceResultsHeading: (count: number) =>
      `Race results (${count} ${count === 1 ? 'race' : 'races'})`,
    didNotTakePart: 'did not take part',
    raceResultAria: (round: number, code: string, result: string, skipped = false) =>
      skipped
        ? `Round ${round} ${code}: race skipped`
        : `Round ${round} ${code}: ${result === '' ? 'did not take part' : result}`,
    raceSkippedSuffix: 'skipped',
    closeSheet: 'Close driver details',
    sheetBodyAria: 'Driver statistics and race results',
    raceTableAria: 'Per-race results',
  },
  compare: {
    sectionAriaLabel: 'Real versus selected system comparison',
    realColumn: 'Real',
    realColumnWithSystem: (realSystem: string) => `Real (${realSystem})`,
    diffColumn: 'Δ',
    pointsColumn: 'Pts',
    realListAria: 'Real championship order',
    altListAria: (systemId: string) =>
      `${systemId === 'custom' ? 'Custom' : systemId} rules championship order`,
    inspectorHint: 'Hover, focus, or select a driver to inspect position change.',
    inspectorTransition: (
      realPos: string,
      realPts: string,
      systemId: string,
      altPos: number,
      altPts: string,
    ) =>
      `Real: ${realPos} (${realPts} pts) → ${systemId === 'custom' ? 'Custom' : systemId}: P${altPos} (${altPts} pts)`,
    rowAria: (sideLabel: string, pos: string, driverName: string, points: string) =>
      `${sideLabel} ${pos} ${driverName}, ${points} points`,
  },
  compareMatrix: {
    caption: (season: number) => `How each points system ranks the ${season} season`,
    driverColumn: 'Driver',
    sortByRealAria: 'Sort by real championship position',
    sortBySystemAria: (systemLabel: string) => `Sort by ${systemLabel} position`,
    selectSystemTitle: (systemLabel: string) => `Select ${systemLabel} system`,
    selectSystemAria: (
      systemLabel: string,
      isReal: boolean,
      championSurname: string | null,
      championChanged: boolean,
    ) => {
      const details: string[] = []
      if (isReal) {
        details.push('historical')
      }
      if (championSurname) {
        details.push(
          championChanged
            ? `champion: ${championSurname}, changed`
            : `champion: ${championSurname}`,
        )
      }
      return details.length > 0
        ? `Show ${systemLabel} system (${details.join(', ')})`
        : `Show ${systemLabel} system`
    },
    championAria: (code: string, changed: boolean) =>
      changed ? `Champion changed to ${code}` : `Champion: ${code}`,
    missingCellAria: 'Not classified under this system',
    empty: 'No comparison data available for this season.',
  },
  progression: {
    sectionAriaLabel: 'Points progression chart',
    decidedLabel: 'Decided',
    clinchedSentence: (surname: string, round: number, code: string, racesRemaining: number) =>
      racesRemaining > 0
        ? `${surname} clinched it at round ${round} (${code}), with ${racesRemaining} ${racesRemaining === 1 ? 'race' : 'races'} to go.`
        : `${surname} clinched it at round ${round} (${code}).`,
    finalRaceSentence: 'Decided at the final race.',
    driversLabel: 'Drivers',
    shownCount: (count: number) => `${count} shown`,
    top5Button: 'Top 5',
    clearButton: 'Clear',
    tooltipRound: (round: number, code: string) => `R${round} · ${code}`,
    srTableCaption: (season: number, systemId: string) =>
      `Cumulative points by race for ${season} (${systemId === 'custom' ? 'Custom' : `${systemId} rules`})`,
    srDriverColumn: 'Driver',
    empty: 'No progression data available for this season.',
    noDriversSelected: 'Select one or more drivers below to show their progression.',
  },
  scenario: {
    buttonLabel: 'Scenario',
    buttonAriaWithCount: (count: number) =>
      count === 0 ? 'Scenario' : `Scenario (${count} active)`,
    title: 'Scenario',
    closePanel: 'Close scenario panel',
    panelBodyAria: 'Scenario controls',
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Could not copy — select the link',
    reset: 'Reset',
    driversLegend: 'Remove drivers',
    driversRemoved: (count: number) => `${count} removed`,
    driversSearchLabel: 'Filter drivers',
    driversSearchPlaceholder: 'Filter drivers…',
    driversEmpty: 'No matching drivers.',
    racesLegend: 'Remove races',
    racesRemoved: (count: number) => `${count} removed`,
    racesSprintBadge: 'S',
    racesSprintSrOnly: 'sprint weekend',
    cannotSkipAllRaces: 'At least one race must remain in the season.',
    raceChipAria: (round: number, code: string, isSprint: boolean, isSkipped: boolean) => {
      const parts = [`Round ${round} ${code}`]
      if (isSprint) {
        parts.push('sprint weekend')
      }
      if (isSkipped) {
        parts.push('removed')
      }
      return parts.join(', ')
    },
    bonusesLegend: 'Sprint & fastest lap',
    scoreSprintsLabel: 'Score sprint races',
    fastestLapLabel: 'Fastest-lap bonus',
    noFastestLapHint: 'This system has no fastest-lap bonus',
    noFastestLapCustomHint: 'Turn on the fastest-lap point in the custom system below',
    multipliersLegend: 'Real-life multipliers',
    presetHistorical: 'Historical',
    presetPure: 'Pure',
    presetAll: 'All',
    presetHistoricalHelp:
      'Half points for shortened races; double points only in 2014 under the 2010 system',
    presetPureHelp: 'No multipliers: every race scores in full',
    presetAllHelp: 'Every real-life multiplier under every system',
    customLegend: 'Custom system',
    createFromCurrentRules: 'Create custom system from current rules',
    customPointsLabel: 'Race points (comma-separated)',
    customPointsPlaceholder: '25,18,15,12,10,8,6,4,2,1',
    customFlLabel: 'Fastest-lap +1 (top 10)',
    customSprintLabel: 'Sprint points',
    customSprintNone: 'None',
    customSprint321: '3-2-1',
    customSprint8: '8-7-6-5-4-3-2-1',
    customBestLabel: 'Count only best N results',
    customBestNumberLabel: 'Best results count',
    customBestError: 'Enter a whole number between 1 and 40.',
    chipsRegionAria: 'Active scenario changes',
    chipWithoutDriver: (code: string) => `Without ${code}`,
    chipNoRace: (code: string) => `No ${code}`,
    chipSprintsOff: 'Sprints off',
    chipNoFastestLap: 'No fastest-lap bonus',
    chipPureMultipliers: 'Pure multipliers',
    chipAllMultipliers: 'All multipliers',
    chipCustomPoints: (preview: string) => `Custom: ${preview}`,
    chipRemoveAria: (label: string) => `${label} — remove`,
  },
  home: {
    title: 'Same races. Different rules.',
    titleAccent: 'A different champion.',
    intro:
      'AlterF1 replays every Formula 1 season since 1950 under five historical points systems.',
    countLine: (count: number) =>
      `In ${count} seasons, another system crowns someone else.`,
    cardsHeading: 'Seasons where the champion changes',
    realLine: (name: string, system: string) => `Real champion: ${name} (${system} rules)`,
    underRules: (system: string) => `${system} rules`,
    alternativeAria: (year: number, system: string, winner: string, real: string) =>
      `${year} under ${system} rules: ${winner} instead of ${real}`,
    realFinish: (surname: string, position: number) => `${surname} P${position}`,
    pickerHeading: 'Or open any season',
    pickerHint: 'Pick a year to see its standings under every system.',
    loadError: 'Could not load the highlights.',
  },
  footer: {
    dataPrefix: 'Data: ',
    f1dbName: 'F1DB',
    licenseSuffix: ' (CC BY 4.0)',
  },
} as const
