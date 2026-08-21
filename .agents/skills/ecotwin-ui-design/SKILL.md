---
name: ecotwin-ui-design
description: Use when designing, reviewing, or polishing EcoTwin's climate-tech dashboard UI. Focus on premium scientific climate-tech aesthetics, clear interaction hierarchy, digital-twin legibility, accessibility, and hackathon demo impact. Preserve the simulation engine and product logic. Do not use for simulation math, optimizer logic, weather modeling, or backend work.
---

# EcoTwin UI Design Skill

## Mission

Design EcoTwin as a credible, premium climate-tech product rather than a generic hackathon dashboard.

The interface should feel:

- calm
- precise
- scientific
- editorial
- modern
- trustworthy
- environmentally aware without looking childish
- visually distinctive enough to be memorable in a hackathon demo

The UI must communicate the product within 10 seconds:

Configure a classroom → observe energy impact → understand what causes the impact.

## Preserve Before Improving

Before changing anything:

1. Inspect the existing UI and identify what is already working.
2. Preserve successful visual language unless there is a clear improvement.
3. Do not redesign the entire product merely to demonstrate creativity.
4. Prefer high-impact targeted improvements over broad rewrites.
5. Never modify the simulation engine for visual reasons.

## Core Visual Language

### Color

Prefer:
- warm off-white / very pale neutral backgrounds
- deep desaturated forest / slate greens
- restrained climate teal
- muted blue only where data meaning benefits from it
- subtle warm amber for energy/device accents

Avoid:
- purple-blue AI gradients
- neon green
- saturated startup gradients
- excessi- excesi-- excessi- e- - excessi- excesi-- excessi- e- - excesse

Color should communicate system state and information hierarchy.

### Typography

Use a refined editorial hierarchy.

Display typography may have character and elegance.

Body/interface typography must remain extremely readable.

Prefer:
- confident large headlines
- restrained uppercase micro-labels
- compact technical metadata
- tabular/clear numerical presentation for metrics

Avoid:
- oversized marketing headlines that push the actual product below the fold
- too many font sizes
- overly playful typography

Numbers are important product content and should receive strong visual hierarchy.

## Layout

Prioritize laptop / desktop hackathon demonstration.

The first viewport should communicate:

- what EcoTwin is
- current energy impact
- current classroom state
- where the user can interact

Avoid excessive vertical scrolling before meaningful interaction appAvoid


void excessive vertical ulvoid excess.
void excessive verticall groupvoid excessive verticall groupvoid excessive verticall groupvoid excessi elvoid excessive verticall groupvoid excessive verticall groupvstraivoid exceing
- l- l- l- l- l- l- l- l- l- l- l- lnd tint where useful
- careful spacing

Avoid:
- excessive glassmorphism
- huge shadows
- every section becoming an identical rounded card
- nested cards inside cards without a clear reason

Cards must express hierarchy, not merely contain content.

## Digital Twin

The Classroom Digital Twin is the visual centerpiece of EcoTwin.

It must feel connected to the controls and simulation rather than decorative.

State changes should be visually observable where practical:

- lighting level chang- lighting level chang- lighting level chang- lightibly darkens/deactivates lighting
- HVAC active shows subtle airflow or active state
- HVAC off visibly becomes inactive
- devices active/inac- devices active/inac- devices active/inac- devices active/inac- devicesancy
- thermostat value is easy to see
- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- re- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- exp- ou- ou- ou- ou subtle mo- ou- ou- ou- ou- ou- outi- ou- ou- ou up- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou- ou
- - - - - - - - - - - - - - - - - - - - - - -ting anim- - - - - - - - - - - - - - - - - - - - - - -ting anim- ic - - - - - - - ts
- - - - - - - - - - - - - - - - - - - - - - -ting anim- - - educed- - - - - - - - - - - - - - - - - - - - - - -ting anim- - - educed- - - - -re content.

Metrics should:
- be legible during video recording
----------------------------------------------------------------------------------------------------------- -------------------------------------------------pl----------------------------------ation.

Eco Score is a supporting heuristic, not the most authoritative metric.

Actual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActecActual modeled enerActual modeled enerActual modreateActual modeled enerActual modeled enerActual modreateActual modeled enerActabled state

Prefer sliders for bounded continuous values and toggles for system state.

Do not turn every parameter into a text box.

Reset functionality should be visibleReset functionality should be visiacReset functionality should be visibleReset functionality should be visiacReset functionality should be visibleReset functionality should be visiacReset functionality should be visibleReset functionagitReset functionality should be visibleReset functionality should be vis. later, optimization can show a strong before/after comparison

Avoid UI details that require verbal explanation to understand.

## Anti-Patterns

Do NOT introduce:

- generic AI chatbot interfaces
- AI sparkle branding
- fake "AI powered" claims
- purple/blue gradient hero sections
- cyberpunk styling
- excessive glassmorphism
- fake scientific precision
- unnecessarily complex navigation
- login/dashboard boilerplate
- decorative 3D
- excessive badges
- random illustrations
- stock-photo aesthetics

## Implementation Rules

Use the existing stack:
----------------------------------------------------------------------al.

ReReReReReReReReReReReReReReReReReReReReReRecturally sound.

Do not duplicate simulation formulas in UI code.

Do not modify `src/lib/simulation/` unless explicitly instructed for a genuine functional bug.

Do not implement optimizer or weather functionality during pure UI-polish tasks.

## Review Workflow

When asked to review an existing EcoTwin UI:

1. Inspect the rendered experience or supplied screenshots.
2. Inspect the relevant components and sty2. Inspect the relevant components and sty2. Inspect the relevnti2. Inspect  highes2. Inspect the rses.
5. Rank changes by:
   - judge   - judge   -
   - visual distinction
   - interaction clarity
   - demo impact
   -    -    -    - risk
   -    -    -   with high   -    -    -   with higtur   -    -    -   with high   -   ex   -    -    -   with high  8.   -    -  espon   -    -    access   -    -    -   with a   -    -    -   with h# F   -    -    -   with for   -    -    -   with sk   -    -    -   with high   -    -    -   with higtur   -    -    -   wke    -    -    -   with high   -    -    -   with higtur  te?
------------------------------------------------ th------------------------------------------------ th------------------------------------------nge?
- Is there any unnecessary visual decoration?
- Is every important number labeled with a unit?
- Are estimates presented honestly?
- Did the work preserve existing functionality?
