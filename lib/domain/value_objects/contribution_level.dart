/// Five-level contribution intensity, matching GitHub's own bucketing.
///
/// [none] means zero contributions that day. [veryHigh] is the darkest
/// shade in any palette — the top ~10% of active days.
enum ContributionLevel { none, low, medium, high, veryHigh }
