# Deployment log

- V2 art direction approved at `075a69c` (branch `wip/v2-art-direction`), fast-forwarded into `main`.
- Rollback point: tag `pre-v2-rollback` = `86ae4a4` (previous production). To roll back, `git revert` the V2 range on `main`; never force-push.
- The fast-forward push did not trigger a Pages build, so this note is a normal follow-up commit that does.
