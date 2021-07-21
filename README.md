# Card-automation

Automate project card movement when an issue is labeled. A card will only move within a project that it is already assigned to.

How to use:
```yml
on:
  issues:
    types: [labeled]
 
jobs:
  automate-issues-labels:
    runs-on: ubuntu-latest
    steps:
      - name: Move to In Progress
        uses: bishalrai96/Project_Card_Automation@master
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
          label: "in progress"
          column: "In Progress"
          remove-label: "test, review, ready"

```

Expected Inputs

| Input         | Description                                                            | Optional |
| ------------- | ---------------------------------------------------------------------- | -------- | 
| repo-token    | Github repo token                                                      |    No    |
| label         | label that triggers the the whole action                               |    No    |
| column        | destination column                                                     |    No    |
| remove-label  | label to remove when a card has been removed to the destination column |    Yes   |

