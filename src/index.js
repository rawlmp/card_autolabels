const core = require('@actions/core');
const github = require('@actions/github');

try {
    async function run() {
        var removeLabels = ""
        const token = core.getInput('repo-token');
        const columnName = core.getInput('column');
        const label = core.getInput('label');
        const octokit = github.getOctokit(token);
        const { eventName, payload } = github.context;
        removeLabels = core.getInput('remove-label').split(",").map(label => label.trim());

        if (eventName !== "issues") {
            throw new Error("Only issues event accepting at the moment");
        }

        // get required information for graphql query
        url = payload.issue.html_url;

        if (payload.label.name == label) {
            get_which_projects_it_is_in_currently = `query { 
              resource(url:"${url}") {
                ... on Issue {
                  id
                  repository {
                    url
                  }
                  projectCards {
                    nodes {
                      id
                      project {
                        name
                        columns(first: 100) {
              	            nodes {
                                name,
                                id
                            }
                        }
                      }
                      column {
                        id
                      }
                    }
                  }
                }
              }
            }`;

            
            const {resource} = await octokit.graphql(get_which_projects_it_is_in_currently);
            var LabelIDToNamePair = {}
            // Id of labele, AKA id of issue
            const labeleID = resource.id;
            var repoUrl = resource.repository.url;
            
            var projectCards = resource.projectCards.nodes;
            // stores mapped info of which card needs to moved to which column
            var cardIdToColIdMap = {}

            // Go through each project card
            for (const projectCard of projectCards) {
                columns = projectCard.project.columns.nodes;
                for (const col of columns) {
                    // check if a project card's assigned project has a destination column
                    if (columnName === col.name) {
                        cardIdToColIdMap[projectCard.id] = col.id;
                    }
                }
            }

            if (Object.keys(cardIdToColIdMap).length == 0) {
                console.log(columnName + " does not match with any columns in the assigned project");
                return 
            }


            Object.keys(cardIdToColIdMap).forEach(function (key) {
                mutationQueryMoveCard(octokit, key, cardIdToColIdMap[key]);
            });

            var LabelIDToNamePair = await getLabelNameToIDMap(octokit, repoUrl);

            for (const label of removeLabels) {
                if (LabelIDToNamePair[label] === undefined) {
                    console.log("label " + label + " is not on the issue");
                } else {
                    removeLabel(octokit, labeleID, LabelIDToNamePair[label]);
                    console.log("label removed " + label);
                }
            }

            
        } else {
            console.log("Ignoring because provided label does not match");
        }
    }
    run()
    
} catch (error) {
    console.log("failed but why ", error.message)
    core.setFailed(error.message)
}

async function mutationQueryMoveCard(octokit, cardId, columnId) {
    mutate_query = `mutation {
                  moveProjectCard(input: {
                    cardId: "${cardId}"
                    columnId: "${columnId}"
                    }) {clientMutationId}
                }`
    await octokit.graphql(mutate_query);
}


async function getLabelNameToIDMap(octokit, repoUrl){
    var LabelIDMap = {}
    var labelsQuery = `query {               
                        resource(url: "${repoUrl}") {
                        ... on Repository {
                                labels(first: 100) {
                                nodes {
                                    name
                                    id
                                }
                            }
                        }
                    }
                }`

    var allLabels = await octokit.graphql(labelsQuery);
    allLabels.resource.labels.nodes.forEach(function (item) {
        LabelIDMap[item.name] = item.id;
    })
    return LabelIDMap;
}

async function removeLabel(octokit, labeleID, labelID) {
    var removeLabel = `mutation {
                        removeLabelsFromLabelable(input: { labelableId: "${labeleID}", labelIds: "${labelID}" }) {
                            clientMutationId
                        }
                    }`
    await octokit.graphql(removeLabel);
}
