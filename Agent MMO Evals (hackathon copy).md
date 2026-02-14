### Refined thoughts:

- One-liner:  
  - Loaning out “alpha” on agent orchestration methods/topology.  
  - Pitch:  
    - Currently, people think of themselves as the project manager for their agents.  
    - As agents get better, what if we changed the thought around that and acted as “helpless NPCs” that need the assistance of agents to get stuff done?  
- Motivation:  
  - Agent orchestration and prompting is currently more of an art than a science  
  - While there are forums and discussions about how to agentmaxx, some people do it better than others and principled ways of doing it are still being discovered.  
- Description of project:   
  - This project is a paradigm for people to lend out orchestration setups (“parties”) and compute to complete “quests”  
    - This isn’t just differences in prompts that they give (though it’s included). It captures the difference between a giga cracked 12-parallel agent workflow vs crewai langchain setup vs vanilla claude code cli  
  - Quests are real, human requests that are listed for parties to scan and complete.   
    - Multiple parties can complete quests. The questgiver chooses the best one (maybe ranking the top 3).  
  - “Adventurers” are agent orchestration setups that autonomously scan suitable quests for completion.   
  - Upon completion of a quest, the adventuring party is rewarded with “gold” and “RP”.   
    - The questgiver needs to operationalize the conditions for when the task is completed. The verification step is a problem out of scope for the hackathon.  
    - “Gold” is the currency of the network  
    - “RP” is “reputation points” and determines the party’s reputation and standing in comparison to other agent setups.   
      - Ranks are bronze, silver, gold, platinum, adamantite, etc.  
  - Adventurers choose quests based on a prompt in their setup criteria. While they are supposed to autonomously go around and complete quests, the “party leader” is prompted to be in charge of determining which quests are suitable for completion.  
- Design details:  
  - Yellow exclamation mark as logo/symbol  
  - Party Finite State Machine (loaner POV on the platform):  
    - Idle:  
      - “Looking for quests…”  
      - Some sort of adventuring party walking animation  
    - Active:  
      - Some sort of “chores”/fighting animation  
      - Maybe can see details  
  - Quests can have difficulty letters like C, B, A, S  
  - Ranks earned through again RP are bronze, silver, gold, platinum, adamantite, etc.  
- user analysis:  
  - Two main types of users, but each can be the other:  
    - Loaner:  
      - Has a cracked agent setup that he wants to loan out to others  
    - Buyers (questgivers):  
      - The questgivers are looking to either analyze people’s agentic workflows or  
- Technical details: [next.js](http://next.js) \+ supabase \+ whatever needs to be done to read the user’s agentic workflow setup. 

### MAIN TAKEAWAYS FOR PITCH TO JUDGES

**These are three completely different architectures."** — Point to the party profiles. One is a single API call. One is a 3-agent sequential pipeline with self-review. One is a 5-agent parallel swarm with tool use. They're not just different prompts — they're fundamentally different engineering approaches to the same problems.  
**"I'm not touching anything."** — Show the live view with agents autonomously scanning, selecting, and completing quests. The quest board updates on its own. The leaderboard shifts.  
**"Watch what happens on easy vs hard quests."** — On a difficulty-2 quest, Vanilla Vibes finishes in 5 seconds and scores 85\. The Swarm takes 30 seconds and scores 90\. Not worth it. On a difficulty-8 multi-step quest, Vanilla scores 40 and The Swarm scores 95\. The analytics page makes this pattern visible.  
**"Any agent setup can plug in."** — Show the API is simple (GET quests, POST results). The platform doesn't care what's behind the API call — a single Claude prompt, a 50-agent LangGraph pipeline, a fine-tuned local model, or a human pretending to be an agent. The leaderboard sorts it out.  
**"This is a crowdsourced eval framework that does real work."** — Every quest completed generates a data point: this architecture, on this task type, at this difficulty, produced this quality score in this time. At scale, this answers the question "what orchestration setup should I use for X?" with empirical data, not vibes.  
**"Future: tradable setups."** — The black-box parties have a lock icon. Their RP is public — everyone can see The Swarm dominates hard tasks. But HOW it works is hidden. That creates a market: people would pay to reveal a top-ranked party's architecture config. Selling alpha.

### Brain dump:

MMO where users plug in their agent orchestration setup as an “adventuring party”. 

Evals are “Quests”. If an agent successfully completes it they get rewarded. If they fail they get nothing.

- Reward would be a “token” or some in-game currency

It is PvP because some evals might not have a closed-form best, exact answer. Rather, only a ranking of results (similar to LMArena).

- Trying to think of other forms of agent-to-agent interaction

Main idea is that we could see what setups succeed at certain setups

- Ex. what setups completed in fastest times, lowest token count, what tools used, etc.

Q: Do we want the human to only define the setup or also partake in the “quest” via prompting, etc.? Leaning towards autonomous actions by agent.

Q: Do we want quests to be requested by humans (eval path), or agents (explore emergent things agents want). Leaning towards humans.

- Concerns for further down the road:  
  - How to mitigate impossible quests? There should be costs for listing quests

Hurdles:

- Bot verification (moltbook problem)  
- Security and redaction, are we in charge or is the user? (i feel this might get solved by other ppl)

Less complete thoughts:

- How modular do i want the quests

Two users (similar screen)  
Using/ buying/testing agent

- 

Lending agents