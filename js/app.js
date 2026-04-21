// Fix league mode filtering to ensure both teams come from selected league
function filterLeagueMode(teams, selectedLeague) {
    return teams.filter(team => team.league === selectedLeague);
}

// Add new 80+ exclusive draft mode where only elite teams (OVR >= 80) are available
function getEliteDraftTeams(teams) {
    return teams.filter(team => team.OVR >= 80);
}

// Improve tournament level filtering to properly check OVR limits
function filterTournamentWithOVR(teams, ovrLimit) {
    return teams.filter(team => team.OVR <= ovrLimit);
}

// Assuming you have the appropriate calls in your original code
// Update your calls to use these new functions accordingly
