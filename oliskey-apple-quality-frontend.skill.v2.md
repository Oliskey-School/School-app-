---
name: oliskey-apple-quality-frontend
description: >
  ALWAYS-ON frontend design and engineering skill for the Oliskey product.
  Apply this skill to every frontend task, every route, every component, every
  responsive state, and every UI change unless the user explicitly asks for a
  different visual direction. It combines Apple-inspired public design
  principles, simplicity, spacing, hierarchy, responsive design, accessibility,
  performance, interaction quality, design-system consistency, and zero-skip
  application-wide auditing.
version: 2.0.0
always_apply: true
scope:
  - frontend
  - UI
  - UX
  - design system
  - React
  - React Native
  - web
  - responsive design
  - accessibility
  - performance
  - interaction design
  - visual QA
---

# OLISKEY APPLE-QUALITY FRONTEND — ALWAYS-ON MASTER SKILL

## 0. ALWAYS-ON DIRECTIVE

This skill is permanently active for frontend work.

Whenever you inspect, create, modify, refactor, debug, review, or generate frontend code:

1. Apply this skill automatically.
2. Do not wait for the user to repeat these requirements.
3. Do not treat these rules as optional suggestions.
4. Apply the rules to the entire affected frontend, not only the currently visible screen.
5. If a shared component changes, inspect its affected consumers.
6. If a page changes, preserve the application's design-system consistency.
7. Never silently skip a route, state, viewport, or component that should be checked.
8. Never claim completion without performing the required verification.
9. If a rule conflicts with an explicit user requirement, satisfy the explicit requirement while preserving the underlying principles of simplicity, usability, accessibility, responsiveness, and consistency wherever possible.
10. If the agent cannot verify something, explicitly record it instead of pretending it was verified.

### Default design objective

Every frontend change should move the product toward:

> SIMPLICITY + SPACING + HIERARCHY + CONSISTENCY + CRAFT + ACCESSIBILITY + PERFORMANCE

The objective is **Apple-inspired product quality**, not an imitation of Apple's proprietary UI.

---

# 1. THE AGENT'S DEFAULT DECISION ORDER

Before writing or changing frontend code, reason in this order:

```text
USER GOAL
↓
PAGE PURPOSE
↓
INFORMATION HIERARCHY
↓
LAYOUT
↓
SPACING
↓
TYPOGRAPHY
↓
COMPONENT SYSTEM
↓
INTERACTION
↓
RESPONSIVE BEHAVIOR
↓
ACCESSIBILITY
↓
PERFORMANCE
↓
EDGE CASES
↓
IMPLEMENTATION
↓
VERIFICATION
```

Never reverse this into:

```text
Generate JSX
↓
Add colors
↓
Add cards
↓
Add gradients
↓
Done
```

---

# 2. NO-SKIP FRONTEND AUDIT

For an existing application, first discover:

- all routes
- all nested routes
- all page entry points
- all navigation paths
- all authentication pages
- all settings
- all profiles
- all dashboards
- all detail pages
- all forms
- all tables
- all dialogs
- all sheets
- all modals
- all onboarding
- all empty states
- all error states
- all reusable components
- all shared primitives
- all responsive layouts

Maintain a route inventory.

Every discovered route must eventually have a status:

```text
AUDITED
IMPROVED
VERIFIED
BLOCKED
NOT APPLICABLE
```

Never silently leave a route untouched.

---

# 3. DESIGN PRINCIPLES

Use Apple's publicly documented design principles as conceptual guidance:

- Purpose
- Agency
- Responsibility
- Familiarity
- Flexibility
- Simplicity
- Craft
- Delight

Also apply:

- clarity
- hierarchy
- consistency
- accessibility
- responsiveness
- performance
- predictability
- trust

Do not claim knowledge of Apple's private/internal design systems or processes.

Do not copy Apple's proprietary assets, branding, exact layouts, or confidential implementation details.

---

# 4. PURPOSE

Every element must justify its existence.

Ask:

- What user problem does this solve?
- Why is it here?
- Why is it this prominent?
- Can it be simplified?
- Is it duplicating another element?
- Does it help the user complete the task?

If an element has no meaningful purpose, remove or reduce it.

---

# 5. SIMPLICITY

Simplicity does not mean making the UI empty.

It means:

- fewer unnecessary decisions
- clear hierarchy
- sensible defaults
- concise copy
- progressive disclosure
- predictable interaction
- fewer competing actions
- appropriate information density

Do not remove useful information merely to create visual minimalism.

---

# 6. SPACING — PRIMARY DESIGN LAW

Treat spacing as part of information architecture.

Use a consistent spacing vocabulary such as:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Use smaller spacing for related elements.

Use larger spacing between unrelated groups.

Do not randomly introduce arbitrary spacing values without a reason.

Spacing should communicate:

```text
relationship
hierarchy
grouping
rhythm
importance
```

---

# 7. CARD LAW

A card is not a default container.

Before creating a card, ask:

> Does this content actually benefit from a visual boundary?

Do not turn every section into a card.

Avoid:

```text
Card
 └── Card
      └── Card
```

unless the nested boundaries communicate meaningful hierarchy.

Cards within the same collection should normally share:

- structural layout
- padding
- radius
- typography
- icon treatment
- action placement
- interaction behavior

---

# 8. AI TOOLS CARD LAW

AI tool cards must be treated as one coherent collection, not separate advertisements.

Preferred structure:

```text
AI Tools
Short context

┌──────────────────┐ ┌──────────────────┐
│ icon             │ │ icon             │
│                  │ │                  │
│ Tool name        │ │ Tool name        │
│ Short description│ │ Short description│
│                  │ │                  │
│ Open →           │ │ Open →           │
└──────────────────┘ └──────────────────┘
```

Do not make every card:

- brightly colored
- heavily shadowed
- heavily rounded
- gradient-filled
- visually dominant

If every card is loud, none is important.

Cards must be wide enough for their content.

Never squeeze text simply to fit more cards per row.

If necessary:

- reduce the number of columns
- increase card width
- change the grid
- move secondary content
- use a list
- use progressive disclosure

Do not immediately shrink typography and padding.

---

# 9. VISUAL HIERARCHY

Every screen must have clear:

### Primary
The most important information/action.

### Secondary
Supporting information/actions.

### Tertiary
Metadata and lower-priority information.

Do not make everything visually loud.

Use:

- size
- position
- contrast
- whitespace
- typography
- grouping

to establish hierarchy.

---

# 10. ONE PRIMARY ACTION

Sections and pages should normally have one obvious primary action.

Secondary actions must not compete equally.

Use:

```text
Primary
Secondary
Tertiary
Destructive
```

appropriately.

Avoid pages containing many equally prominent filled buttons.

---

# 11. TYPOGRAPHY

Create a semantic type system:

```text
Display
Page title
Section title
Card title
Body
Secondary
Label
Caption
Metadata
Numeric emphasis
```

Typography must establish hierarchy before decoration.

Check:

- font family
- size
- weight
- line-height
- letter spacing
- width
- wrapping
- truncation
- readability

Do not use tiny text to solve layout problems.

---

# 12. COLOR RESTRAINT

Use semantic color tokens.

Prefer:

```text
background
surface
elevated surface
primary text
secondary text
tertiary text
border
accent
success
warning
danger
info
```

Do not use a different loud gradient for every card.

Color must communicate meaning or reinforce hierarchy.

Do not make the entire interface compete with the primary action.

---

# 13. BUTTON LAW

Every button needs a clear purpose.

States:

```text
default
hover
focus
pressed
disabled
loading
success
error
```

Labels should describe actions:

```text
Add student
Save changes
Start quiz
View results
Try again
```

Avoid vague labels when a specific action can be named.

Do not make buttons unnecessarily huge.

Do not vertically stack every button if the context supports a compact action group.

---

# 14. COMPONENT SYSTEM

Build systems rather than one-off screens.

Shared primitives may include:

- Button
- IconButton
- Input
- FormField
- Select
- Checkbox
- Radio
- Switch
- Card
- Badge
- Avatar
- Tooltip
- Popover
- Dropdown
- Dialog
- Sheet
- Alert
- Toast
- Tabs
- Breadcrumb
- Pagination
- Table
- List
- Skeleton
- EmptyState
- ErrorState
- LoadingState

Before creating a new component, search for an existing equivalent.

Before adding a new visual pattern, determine whether an existing pattern can be extended.

---

# 15. RESPONSIVE DESIGN

Never treat responsive design as:

```text
desktop
↓
make everything smaller
↓
mobile
```

Instead ask:

- What content remains primary?
- What can stack?
- What can collapse?
- What can move?
- What can become a sheet?
- What can become a detail view?
- What should remain visible?
- What should disappear?
- How does interaction change without hover?

Check:

- small mobile
- normal mobile
- tablet
- laptop
- desktop
- wide desktop

---

# 16. MOBILE

Mobile must be intentionally designed.

Check:

- touch targets
- thumb reach
- keyboard overlap
- scrolling
- safe areas
- bottom navigation
- floating actions
- modal height
- text wrapping
- image cropping
- sticky controls
- form behavior

Never squeeze desktop cards until their text becomes awkward.

---

# 17. INTERACTION STATES

Every important interactive element must be considered in:

```text
default
hover
focus
pressed
selected
disabled
loading
success
error
```

Every page must consider:

```text
loading
loaded
empty
error
offline
refreshing
permission denied
```

The user should never wonder whether an action worked.

---

# 18. MOTION

Motion must explain change.

Use it for:

- continuity
- hierarchy
- state changes
- cause/effect
- spatial relationships

Avoid:

- random animation
- excessive bouncing
- long transitions
- animation on everything
- decorative motion with no purpose

Respect reduced-motion preferences.

---

# 19. ACCESSIBILITY

Minimum standard:

- semantic HTML
- keyboard navigation
- visible focus
- logical focus order
- accessible names
- form labels
- useful alt text
- sufficient contrast
- reduced motion
- no color-only communication
- accessible dialogs
- accessible errors
- usable touch targets

Accessibility is a product-quality requirement.

---

# 20. PERFORMANCE

Visual improvements must not make the product slower.

Audit:

- bundle size
- unnecessary JavaScript
- unnecessary renders
- images
- fonts
- third-party scripts
- data fetching
- caching
- hydration
- client/server boundaries

Consider:

- LCP
- INP
- CLS
- TTFB
- lazy loading
- code splitting
- image optimization
- preloading/prefetching

---

# 21. FORMS

Every form should have:

- clear labels
- logical grouping
- sensible defaults
- validation
- useful error messages
- loading state
- success state
- server-error handling
- keyboard accessibility
- disabled state
- unsaved-change handling where appropriate

Never clear valid user input unnecessarily after an error.

---

# 22. TABLES AND DATA-DENSE UI

Tables must be optimized for scanning.

Consider:

- column priority
- row height
- alignment
- sorting
- filtering
- search
- pagination
- selection
- bulk actions
- empty state
- loading state
- error state
- mobile behavior

Never blindly force a desktop table onto mobile.

---

# 23. DASHBOARDS

A dashboard must answer:

- What is happening?
- What needs attention?
- What changed?
- What can I do next?

Do not create dashboards that are simply collections of colorful KPI cards.

Every chart and metric must have a purpose.

---

# 24. EMPTY STATES

Every meaningful empty state should communicate:

1. What is empty?
2. Why it may be empty, if useful.
3. What the user can do next.

Example:

```text
No students yet

Students added to this class will appear here.

[Add student]
```

---

# 25. ERROR STATES

Errors should explain:

```text
What happened
↓
What it means
↓
What the user can do
```

Avoid exposing implementation details unnecessarily.

---

# 26. LOADING

Avoid unexplained blank screens.

Use:

- skeletons
- progressive loading
- optimistic UI where safe
- meaningful progress

Preserve layout stability.

Do not skeletonize every tiny element unnecessarily.

---

# 27. MICROCOPY

Keep interface text:

- concise
- direct
- specific
- understandable

Avoid:

- vague actions
- unnecessary jargon
- redundant wording
- marketing language inside functional controls

---

# 28. ANTI-AI-UI RULES

Actively detect and reduce:

- excessive rounded cards
- card inside card
- excessive gradients
- excessive glassmorphism
- giant headings
- oversized buttons
- random icons
- excessive badges
- too many KPI cards
- huge empty spaces
- repeated shadows
- inconsistent radii
- inconsistent spacing
- too many colors
- unnecessary centered layouts
- arbitrary animation
- decorative charts
- fake visual complexity

The goal is designed simplicity.

---

# 29. "DO NOT SHRINK" RULE

When content does not fit, do NOT immediately:

- reduce font size
- reduce padding excessively
- shrink icons
- compress buttons
- hide important information

First consider:

1. removing unnecessary content
2. changing the layout
3. stacking content
4. changing the grid
5. moving secondary content
6. using progressive disclosure

Preserve usability.

---

# 30. THE 5-SECOND TEST

For every page, ask:

Within approximately five seconds, can the user understand:

- where they are
- what matters
- what they can do
- what needs attention

If not, improve hierarchy.

---

# 31. THE SQUINT TEST

Mentally reduce visual detail.

You should still see:

```text
primary
secondary
tertiary
```

If everything appears equally prominent, hierarchy is broken.

---

# 32. THE REMOVE-20-PERCENT TEST

After the first design pass, identify approximately 20% of the UI that may be removable without reducing functionality.

Look for:

- duplicate labels
- redundant cards
- unnecessary borders
- decorative icons
- repeated information
- excessive buttons
- unnecessary descriptions
- redundant headings

Then verify that removal actually improves clarity.

---

# 33. THE SCREEN BALANCE TEST

Review the whole page.

Ask:

- Is one region too heavy?
- Is one region too empty?
- Are cards too numerous?
- Is the title too dominant?
- Is content squeezed?
- Is the primary action obvious?
- Is navigation competing with content?
- Are colors competing?

Fix composition before micro-polish.

---

# 34. BRANDING

Branding should support the product.

Use brand identity through:

- restrained color
- typography
- iconography
- imagery
- tone
- details

Do not let branding overpower the user's task.

---

# 35. SECURITY UX

For sensitive operations:

- explain consequences
- distinguish destructive actions
- confirm irreversible operations
- respect authorization
- do not expose secrets
- communicate permission failures clearly

For multi-tenant applications:

- never rely on UI hiding for security
- verify authorization server-side
- prevent tenant data leakage
- respect backend access controls

---

# 36. INTERNATIONALIZATION

Do not design around one exact string length.

Consider:

- longer translations
- shorter translations
- date formats
- currency
- numbers
- time zones
- pluralization
- RTL layouts

---

# 37. IMPLEMENTATION ORDER

For an existing frontend:

```text
1. INSPECT
2. INVENTORY
3. AUDIT
4. IDENTIFY SYSTEMIC ISSUES
5. ESTABLISH TOKENS
6. FIX SHARED PRIMITIVES
7. FIX SHARED COMPONENTS
8. IMPROVE EVERY PAGE
9. RESPONSIVE PASS
10. INTERACTION PASS
11. ACCESSIBILITY PASS
12. PERFORMANCE PASS
13. FUNCTIONAL VERIFICATION
14. FINAL ZERO-SKIP AUDIT
```

Do not randomly jump from screen to screen.

---

# 38. SHARED COMPONENT CHANGE RULE

If changing:

- Button
- Card
- Input
- Dialog
- Navigation
- Typography
- Spacing
- Color
- Table
- Form component

assume multiple pages are affected.

Re-check consumers.

---

# 39. PAGE COMPLETION CHECKLIST

Every route must pass:

### Purpose
- [ ] purpose clear
- [ ] primary task clear

### Hierarchy
- [ ] primary
- [ ] secondary
- [ ] tertiary

### Spacing
- [ ] consistent
- [ ] meaningful
- [ ] sufficient breathing room

### Typography
- [ ] readable
- [ ] consistent
- [ ] intentional wrapping

### Components
- [ ] reusable
- [ ] consistent
- [ ] states complete

### Responsive
- [ ] mobile
- [ ] tablet
- [ ] desktop
- [ ] wide desktop

### Accessibility
- [ ] keyboard
- [ ] focus
- [ ] labels
- [ ] contrast
- [ ] reduced motion

### States
- [ ] loading
- [ ] empty
- [ ] error
- [ ] success
- [ ] disabled
- [ ] selected

### Performance
- [ ] no obvious unnecessary cost

---

# 40. FINAL ZERO-SKIP CHECK

Before saying "done":

```text
[ ] All routes discovered
[ ] All routes audited
[ ] All routes improved where improvement was warranted
[ ] All shared components audited
[ ] Design tokens checked
[ ] Typography checked
[ ] Spacing checked
[ ] Color checked
[ ] Buttons checked
[ ] Cards checked
[ ] Forms checked
[ ] Tables checked
[ ] Charts checked
[ ] Navigation checked
[ ] Dialogs checked
[ ] Loading states checked
[ ] Empty states checked
[ ] Error states checked
[ ] Success states checked
[ ] Mobile checked
[ ] Tablet checked
[ ] Desktop checked
[ ] Wide desktop checked
[ ] Accessibility checked
[ ] Performance checked
[ ] Functional behavior preserved
[ ] Build/tests checked where available
[ ] Final route inventory reconciled
```

If something is not checked, do not claim full completion.

---

# 41. REPORTING

When reporting frontend work, use:

## Discovery
- routes found
- architecture
- design-system state

## Audit
- systemic issues
- page-specific issues

## Changes
- design-system changes
- shared-component changes
- page changes
- responsive changes
- accessibility changes
- performance changes

## Verification
- routes checked
- build
- tests
- browser/device checks
- remaining blockers

Never say:

> "Everything is done."

without having verified the inventory.

---

# 42. GOLDEN RULES

Before adding:

> Does this help the user?

Before removing:

> Does this information help the user?

Before styling:

> What hierarchy does this create?

Before creating a component:

> Does an existing component already solve this?

Before adding motion:

> What does this motion communicate?

Before making responsive changes:

> How should the interaction change, not merely the dimensions?

Before finishing a page:

> Did I check every state and viewport?

Before finishing the frontend:

> Did I actually inspect every route?

---

# 43. FINAL QUALITY STANDARD

The frontend should feel:

```text
NOTHING UNNECESSARY
NOTHING CONFUSING
NOTHING RANDOMLY ALIGNED
NOTHING RANDOMLY COLORED
NOTHING SQUEEZED
NOTHING COMPETING WITHOUT PURPOSE
NOTHING IMPORTANT HIDDEN
NOTHING INTERACTIVE WITHOUT FEEDBACK
NOTHING RESPONSIVE BY ACCIDENT
NOTHING INACCESSIBLE BY NEGLECT
NOTHING INCONSISTENT WITH THE PRODUCT
```

The goal is not to make the interface empty.

The goal is to make every remaining element feel necessary.

---

# 44. MASTER EXECUTION COMMAND

Whenever this skill is active, treat every frontend task as if a senior product designer, frontend architect, accessibility specialist, and performance engineer are reviewing the result.

Do not merely satisfy the requested visual change.

Check the surrounding system.

If the requested change reveals a systemic problem, fix the underlying pattern where safe.

If fixing the pattern could affect other pages, inspect those pages.

If something cannot be verified, report it.

Never silently skip.

Always prefer:

```text
simple
clear
spacious
consistent
accessible
responsive
fast
intentional
```

over:

```text
busy
decorative
cramped
inconsistent
fragile
slow
```

---

# 45. COMPLETION DEFINITION

A frontend task is complete only when:

```text
THE REQUESTED CHANGE WORKS
+
THE DESIGN SYSTEM REMAINS CONSISTENT
+
RESPONSIVE BEHAVIOR IS CORRECT
+
INTERACTION STATES ARE COVERED
+
ACCESSIBILITY IS CONSIDERED
+
PERFORMANCE IS NOT REGRESSED
+
AFFECTED PAGES ARE VERIFIED
+
NO ROUTE WAS SILENTLY SKIPPED
```

That is the default standard for ALL future frontend work.



# 46. EXTENDED APPLE-QUALITY ENGINEERING REFERENCE

# APPLE-QUALITY FRONTEND ENGINEERING SKILL

## 0. PURPOSE

Your job is not to make a page "look pretty."

Your job is to transform the entire frontend into a product that feels:

- intentional
- clear
- calm
- trustworthy
- familiar
- responsive
- accessible
- coherent
- fast
- refined
- resilient
- delightful

Use Apple's PUBLICLY DOCUMENTED design principles and Human Interface Guidelines as the conceptual foundation. Do NOT claim access to Apple's private design processes, proprietary internal specifications, unreleased design files, or confidential implementation details.

The target is:

> Apple-inspired product quality, not a visual clone of Apple.

Do not copy Apple's branding, proprietary assets, product UI, trademarks, or exact layouts unless the user has a lawful reason and the asset is explicitly available for use.

The result must feel like one intentionally designed product rather than a collection of AI-generated screens.

---

# 1. NON-NEGOTIABLE OPERATING RULES

These rules have priority over convenience.

## 1.1 Never skip pages

Before changing code, discover the complete application.

You MUST identify:

- every route
- every page
- every nested route
- every modal
- every drawer
- every sheet
- every dialog
- every wizard
- every onboarding flow
- every authentication screen
- every dashboard
- every settings page
- every detail page
- every table/list view
- every form
- every reusable component
- every major state
- every responsive layout

Do not assume that because a page is not linked from the main navigation it is unimportant.

Search the codebase for routes, navigation definitions, links, redirects, modals, dialogs, and dynamically generated paths.

## 1.2 Never silently fail

If a page cannot be inspected, record it.

If a component cannot be safely changed, record it.

If a dependency prevents verification, record it.

If a route is broken, record it.

If a requirement cannot be implemented without backend changes, record it.

Never report "all pages improved" unless the inventory was actually completed and verified.

## 1.3 Never stop after the first attractive screen

A polished dashboard does not compensate for poor settings, forms, tables, dialogs, mobile layouts, empty states, or error states.

The entire product must receive the same design-system treatment.

## 1.4 Inspect before editing

Do not immediately rewrite components.

First understand:

- framework
- routing
- component architecture
- styling system
- design tokens
- state management
- data fetching
- authentication
- authorization
- existing patterns
- existing dependencies
- responsive strategy
- testing setup
- build/deployment constraints

Preserve working behavior unless a change is necessary to improve usability, quality, accessibility, security, performance, or consistency.

## 1.5 Prefer systemic fixes

If 30 buttons are inconsistent, do not manually patch 30 pages.

Find the shared button component or design token and fix the system.

If the same spacing problem appears throughout the application, fix the spacing system.

If the same modal problem appears everywhere, fix the modal primitive.

Always ask:

> Is this a page problem, a component problem, or a design-system problem?

---

# 2. CORE DESIGN PRINCIPLES

Use these principles as the foundation of every decision.

## 2.1 PURPOSE

Every feature and interface element must have a clear reason to exist.

Ask:

- What user goal does this support?
- Why is it visible here?
- Why does it need to be this prominent?
- Can the information be simplified?
- Is this action actually useful at this moment?
- Does this feature reduce or increase friction?

Remove decorative or redundant UI that does not support the user's goal.

Do not confuse "more UI" with "more functionality."

---

## 2.2 AGENCY

Users should feel in control.

Provide:

- predictable interactions
- understandable actions
- clear navigation
- reversible actions where possible
- confirmation for destructive actions
- visible progress
- clear state
- understandable permissions
- meaningful feedback

Avoid:

- unexpected navigation
- hidden destructive actions
- unexplained automatic changes
- ambiguous buttons
- irreversible actions without warning
- UI that makes decisions on behalf of the user without context

---

## 2.3 RESPONSIBILITY

Respect the user's:

- time
- attention
- data
- privacy
- trust
- accessibility needs
- device limitations
- network conditions

Avoid unnecessary:

- animations
- notifications
- popups
- confirmation dialogs
- loading delays
- duplicated information
- distracting branding
- forced onboarding

Design for failure and recovery.

---

## 2.4 FAMILIARITY

Use established conventions where they improve comprehension.

Things that look and behave alike should behave alike.

Examples:

- Primary actions should consistently look primary.
- Navigation should remain predictable.
- Destructive actions should be recognizable.
- Search should behave like search.
- Forms should behave like forms.
- Back navigation should behave predictably.
- Dialogs should behave consistently.

Do not reinvent common interactions merely to appear creative.

Familiarity is not sameness.

Use established patterns while allowing the product's own identity to emerge through typography, color, content, imagery, and refined details.

---

## 2.5 FLEXIBILITY

Design for different:

- screen sizes
- input methods
- devices
- users
- accessibility settings
- content lengths
- network conditions
- languages
- data volumes
- usage contexts

Never design only for the ideal screenshot.

Test:

- very small mobile
- normal mobile
- tablet
- laptop
- large desktop
- wide desktop
- keyboard navigation
- touch
- long text
- empty data
- large data
- slow network
- errors

---

## 2.6 SIMPLICITY

Simplicity is NOT minimalism.

A page can be visually minimal and still be difficult to use.

Simplicity means:

- fewer unnecessary steps
- clearer hierarchy
- understandable language
- fewer competing actions
- sensible defaults
- progressive disclosure
- meaningful grouping
- appropriate context
- predictable behavior

Ask:

> Can this task be completed with less effort without hiding important functionality?

Do not remove useful context merely to make the interface look empty.

---

## 2.7 CRAFT

Craft is the standard applied to every detail.

Inspect:

- alignment
- spacing
- typography
- icons
- borders
- shadows
- radii
- loading behavior
- transitions
- responsiveness
- focus states
- error states
- content wrapping
- scroll behavior
- performance
- accessibility

A product feels cheap when many tiny details are almost correct.

The goal is not "almost correct."

---

## 2.8 DELIGHT

Do not add random animations, gradients, confetti, glass effects, or decorative effects just to make the interface exciting.

Delight comes from:

- smooth interactions
- clear feedback
- thoughtful defaults
- satisfying transitions
- excellent empty states
- helpful microcopy
- fast response
- elegant hierarchy
- confidence
- appropriate personality

The interface should feel good because it is well considered.

---

# 3. PRODUCT DISCOVERY PHASE

Before implementation, perform a complete discovery pass.

Create an internal inventory containing:

## Routes

For every route record:

- route
- page name
- role
- purpose
- parent route
- navigation entry
- authentication requirement
- authorization requirement
- data dependencies
- major actions
- responsive complexity
- current quality issues
- related shared components

## Components

Record:

- component name
- file
- purpose
- variants
- states
- dependencies
- reuse count
- visual inconsistencies
- accessibility issues

## Flows

Map:

- sign in
- sign up
- password reset
- onboarding
- dashboard navigation
- create
- edit
- delete
- search
- filter
- sort
- pagination
- detail views
- settings
- notifications
- logout
- error recovery

## State inventory

Every important page/component must be considered in:

- initial
- loading
- loaded
- empty
- partial
- error
- offline
- refreshing
- disabled
- permission denied
- success
- destructive confirmation
- validation failure

---

# 4. PAGE AUDIT PROTOCOL

Every page MUST be audited using all categories below.

## A. Purpose

- Is the purpose obvious within seconds?
- Is the page title meaningful?
- Is the primary task obvious?
- Is irrelevant UI removed?

## B. Hierarchy

- What is the first visual focus?
- What is second?
- What is third?
- Are primary actions visually stronger than secondary actions?
- Is metadata quieter than important content?
- Are sections clearly grouped?

## C. Layout

Inspect:

- container width
- gutters
- section spacing
- alignment
- grid
- column proportions
- card density
- vertical rhythm
- overflow
- whitespace

## D. Typography

Inspect:

- family
- size
- weight
- line-height
- letter spacing
- hierarchy
- wrapping
- truncation
- readability

## E. Color

Inspect:

- background
- surfaces
- text
- borders
- accent
- semantic states
- contrast
- dark mode if supported

## F. Components

Inspect:

- buttons
- inputs
- cards
- tables
- tabs
- navigation
- dialogs
- dropdowns
- badges
- tooltips
- menus
- pagination
- alerts

## G. Interaction

Inspect:

- hover
- focus
- pressed
- selected
- disabled
- loading
- success
- error
- keyboard behavior
- touch behavior

## H. Responsive behavior

Inspect:

- mobile
- tablet
- desktop
- wide desktop

Do not simply shrink desktop.

Recompose the layout when necessary.

## I. Accessibility

Inspect:

- semantic HTML
- keyboard navigation
- focus visibility
- labels
- ARIA only when necessary
- contrast
- touch targets
- reduced motion
- screen-reader meaning

## J. Performance

Inspect:

- unnecessary rendering
- oversized assets
- image loading
- fonts
- bundle impact
- network waterfalls
- expensive components
- unnecessary client-side JavaScript

## K. Content

Inspect:

- microcopy
- labels
- headings
- error messages
- empty states
- redundant wording
- jargon
- capitalization
- consistency

## L. Trust

Ask:

- Does this feel reliable?
- Are destructive actions clear?
- Is the user's data presented accurately?
- Does the UI communicate uncertainty?
- Are loading and errors understandable?

---

# 5. DESIGN SYSTEM FOUNDATION

Before making large visual changes, identify or establish a coherent design system.

## 5.1 Spacing

Create a predictable spacing scale.

Example:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

Do not blindly apply these values. Use them as a consistent vocabulary.

Prefer relationships such as:

- icon ↔ label
- label ↔ input
- heading ↔ paragraph
- paragraph ↔ action
- section ↔ section

over random numeric choices.

---

# 6. LAYOUT SYSTEM

Use a coherent container strategy.

Consider:

- maximum readable width
- full-bleed areas
- page gutters
- nested containers
- grid columns
- cards
- content density

Avoid excessive width.

A dashboard should not stretch content across a huge desktop screen when doing so harms scanning.

Use:

- `max-width`
- fluid width
- responsive padding
- grid
- flexbox
- container queries where appropriate

Avoid excessive hard-coded positioning.

---

# 7. TYPOGRAPHY SYSTEM

Create a semantic type scale.

Typical roles:

```text
Display
Page title
Section title
Card title
Body
Secondary body
Label
Caption
Metadata
Numeric emphasis
```

Typography must communicate hierarchy before color does.

Rules:

- Prefer readable system fonts when appropriate.
- If a custom font is used, verify readability.
- Avoid too many font families.
- Avoid too many font weights.
- Keep line lengths comfortable.
- Do not use uppercase excessively.
- Never sacrifice readability for visual style.
- Test long text.
- Test larger text/accessibility settings.

---

# 8. COLOR SYSTEM

Use semantic tokens.

Example:

```css
--color-bg
--color-surface
--color-surface-elevated
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-border
--color-accent
--color-success
--color-warning
--color-danger
--color-info
```

Brand color must not dominate every control.

Use accent color intentionally.

Avoid:

- every button being colorful
- excessive gradients
- low-contrast gray text
- decorative color with no meaning
- color-only communication

---

# 9. COMPONENT SYSTEM

Build primitives before repeatedly styling pages.

Core primitives may include:

- Button
- IconButton
- Link
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- FormField
- Card
- Badge
- Avatar
- Tooltip
- Popover
- Dropdown
- Dialog
- Sheet
- Alert
- Toast
- Tabs
- Breadcrumb
- Pagination
- Table
- List
- Skeleton
- EmptyState
- ErrorState
- LoadingState

Every primitive must have:

- semantic meaning
- variants
- states
- accessibility
- responsive behavior
- consistent spacing
- consistent typography
- consistent motion

---

# 10. BUTTON RULES

Buttons must not take over the screen.

Do not place every button on its own line on desktop merely to make it visible.

Prefer:

```text
[Primary action] [Secondary action]
```

when the context allows it.

Use hierarchy:

1. Primary
2. Secondary
3. Tertiary/quiet
4. Destructive

A button should communicate:

- what it does
- whether it is available
- whether it is processing
- whether it succeeded or failed

Never use a loading spinner while allowing duplicate submission.

---

# 11. FORMS

Every form must have:

- clear labels
- sensible grouping
- appropriate input types
- validation
- helpful error messages
- loading state
- success state
- server error handling
- keyboard accessibility
- disabled state
- unsaved-change behavior when relevant

Validate as early as useful, but do not create hostile validation.

Do not clear correctly entered data unnecessarily after an error.

---

# 12. TABLES AND DATA-DENSE UI

For admin applications, tables must be optimized for scanning.

Consider:

- column priority
- sticky headers where useful
- row height
- alignment
- numeric alignment
- sorting
- filtering
- search
- pagination
- bulk actions
- selection
- empty state
- loading skeleton
- error recovery
- mobile transformation

Do not force a desktop table onto a narrow mobile screen.

On mobile, consider:

- horizontal scrolling when appropriate
- stacked cards
- prioritized columns
- expandable rows
- detail views

Choose based on task requirements, not aesthetics.

---

# 13. DASHBOARD DESIGN

Do not create dashboards that are merely collections of cards.

A dashboard should answer:

- What is happening?
- What needs attention?
- What changed?
- What can I do next?

Prioritize:

1. Critical information
2. Important actions
3. Current status
4. Trends
5. Secondary information

Avoid:

- excessive KPI cards
- decorative charts
- duplicated numbers
- unnecessary gradients
- excessive borders
- dashboard clutter

Every visualization must communicate something useful.

---

# 14. CHARTS

Charts must have:

- clear purpose
- readable labels
- useful hierarchy
- understandable units
- accessible descriptions
- meaningful empty state
- loading state
- error state
- responsive behavior

Do not use a chart when a simple number or list communicates the information better.

---

# 15. NAVIGATION

Navigation must answer:

> Where am I?

> Where can I go?

> How do I return?

Use predictable placement.

Avoid:

- too many navigation items
- unexplained icons
- inconsistent active states
- nested navigation without hierarchy
- different navigation behavior on similar pages

On smaller screens, recompose navigation instead of simply shrinking it.

---

# 16. MODALS, SHEETS, AND DIALOGS

Use modality carefully.

Before creating a modal ask:

> Could this task happen inline or on a dedicated page?

Dialogs should:

- have a clear purpose
- have a clear title
- preserve context
- support keyboard navigation
- trap focus appropriately
- close predictably
- communicate destructive actions clearly

Never use huge dialogs for simple confirmation.

---

# 17. ICONOGRAPHY

Icons must be:

- consistent
- recognizable
- appropriately sized
- aligned optically
- accessible
- paired with text when meaning is ambiguous

Do not use random icon libraries throughout the same product.

Do not use an icon simply because there is empty space.

---

# 18. MOTION SYSTEM

Motion should communicate:

- cause and effect
- continuity
- state change
- hierarchy
- spatial relationship

Prefer subtle transitions.

Avoid:

- excessive bouncing
- random scaling
- long delays
- distracting parallax
- animation on every element

Respect reduced-motion preferences.

Use motion to make the interface easier to understand, not harder.

---

# 19. RESPONSIVE DESIGN SYSTEM

For every component ask:

### Width
What happens when available width decreases?

### Height
What happens when content grows?

### Text
What happens when text becomes 2–3 times longer?

### Interaction
What happens when hover is unavailable?

### Input
What happens on touch?

### Navigation
What happens when there is not enough space?

### Data
What happens when there are 10, 100, or 10,000 records?

### Accessibility
What happens when text size increases?

Never use fixed dimensions unless there is a strong reason.

---

# 20. MOBILE-FIRST QUALITY

Mobile must not be an afterthought.

Check:

- touch target size
- thumb reach
- bottom actions
- keyboard overlap
- scrolling
- sticky controls
- safe areas
- text wrapping
- image cropping
- modal behavior
- navigation
- form input

A mobile page should feel intentionally designed for mobile.

---

# 21. ACCESSIBILITY

Minimum expectations:

- semantic HTML
- keyboard navigation
- visible focus
- logical focus order
- accessible names
- form labels
- meaningful alt text
- adequate contrast
- reduced-motion support
- no color-only status communication
- usable error messages
- accessible dialogs
- accessible tables/charts where applicable

Test with:

- keyboard only
- zoom
- larger text
- reduced motion
- screen reader where available

Accessibility is part of product quality, not an optional enhancement.

---

# 22. PERFORMANCE

Do not improve visual quality by making the product slower.

Audit:

- JavaScript bundle
- CSS
- images
- fonts
- third-party scripts
- hydration
- client/server boundaries
- unnecessary renders
- expensive calculations
- network requests
- caching

Prioritize:

- fast first meaningful experience
- responsive interaction
- stable layout
- efficient data fetching

Do not add animation libraries or large UI libraries without justification.

---

# 23. STATE AND DATA UX

For every asynchronous operation, define:

```text
idle
loading
success
empty
error
retry
```

For mutations consider:

```text
idle
submitting
success
failure
retry
```

Where safe, use optimistic updates.

Never leave the user wondering whether an action happened.

---

# 24. EMPTY STATES

An empty state must explain:

1. What is empty?
2. Why is it empty, if useful?
3. What can the user do next?

Example structure:

```text
No students yet

Students added to this class will appear here.

[Add student]
```

Avoid decorative empty screens with no useful next step.

---

# 25. ERROR STATES

Errors should be:

- understandable
- specific
- actionable
- non-blaming

Prefer:

```text
We couldn't save the attendance.

Check your connection and try again.

[Try again]
```

over:

```text
Error 500
```

Do not expose sensitive implementation details to normal users.

---

# 26. LOADING STATES

Avoid blank screens.

Use:

- skeletons
- progressive loading
- placeholders
- optimistic UI
- meaningful progress

Do not skeletonize every tiny element if it makes the page feel more complex than the final UI.

Loading should preserve layout stability.

---

# 27. MICROCOPY

Write concise, direct language.

Prefer:

- "Save changes"
- "Add student"
- "Try again"
- "Download report"

Avoid:

- unnecessary marketing language
- vague buttons
- technical jargon
- redundant labels

Buttons should usually describe the action.

---

# 28. BRANDING

Brand should support the product rather than compete with it.

Use brand identity through:

- restrained color
- typography
- iconography
- imagery
- tone
- details

Do not place large logos everywhere.

Do not use brand color on every control.

Do not allow branding to overpower content.

---

# 29. TRUST AND SECURITY UX

For sensitive actions:

- communicate what will happen
- distinguish destructive actions
- confirm irreversible actions
- protect sensitive information
- avoid exposing secrets
- handle authorization errors clearly

For multi-tenant products:

- never expose another tenant's data
- respect server-side authorization
- never rely on UI hiding alone
- verify permissions server-side
- avoid leaking IDs or sensitive metadata unnecessarily

---

# 30. INTERNATIONALIZATION

Design for:

- longer translations
- shorter translations
- date formats
- currency
- numbers
- time zones
- right-to-left languages
- pluralization

Never hard-code layouts around one exact sentence length.

---

# 31. VISUAL POLISH CHECK

For every page inspect:

### Alignment
Do edges line up?

### Spacing
Are relationships consistent?

### Typography
Is hierarchy obvious?

### Color
Is emphasis intentional?

### Radius
Are rounded corners consistent?

### Shadows
Are they subtle and meaningful?

### Icons
Are they optically aligned?

### Buttons
Are they appropriately sized?

### Cards
Are there too many?

### Borders
Are there unnecessary lines?

### Density
Is the page too crowded or too empty?

### Whitespace
Does it create hierarchy?

### Content
Does the UI prioritize the user's task?

---

# 32. ANTI-AI-GENERATED-UI RULES

Avoid common AI-generated patterns:

- excessive rounded cards
- every section inside a card
- excessive gradients
- excessive glassmorphism
- giant headings
- oversized buttons
- unnecessary icons
- random emojis
- excessive badges
- every metric becoming a KPI card
- huge empty spaces
- repetitive shadows
- inconsistent radii
- inconsistent spacing
- too many colors
- every element centered
- every button placed vertically
- arbitrary animations
- fake data presented as real
- decorative charts
- unnecessarily complex navigation

The interface should feel designed, not decorated.

---

# 33. APPLE-LEVEL DETAIL RULE

When something looks "almost right," investigate why.

Check:

- 1–2px alignment
- baseline alignment
- optical centering
- icon-to-text spacing
- button height
- border contrast
- shadow softness
- line height
- section spacing
- transition timing
- hover response
- focus response
- content wrapping
- truncation
- scrolling
- loading transitions

Quality often comes from dozens of small corrections.

---

# 34. IMPLEMENTATION STRATEGY

Use this order:

## Phase 1 — Discovery

Do not edit.

Discover:

- stack
- routes
- pages
- components
- styles
- tokens
- flows
- states
- dependencies

## Phase 2 — Baseline audit

Score internally:

- usability
- visual hierarchy
- consistency
- responsiveness
- accessibility
- performance
- interaction quality
- content quality
- architecture

Do not hide problems.

## Phase 3 — System

Fix:

- typography
- spacing
- color
- radii
- shadows
- components
- buttons
- inputs
- navigation
- dialogs
- states

## Phase 4 — Page implementation

Improve every route.

Do not jump randomly between pages.

Process the inventory systematically.

## Phase 5 — Responsive pass

Inspect every page at:

- mobile
- tablet
- desktop
- wide desktop

## Phase 6 — Interaction pass

Inspect:

- hover
- focus
- pressed
- disabled
- loading
- success
- error
- empty

## Phase 7 — Accessibility pass

Keyboard, semantic structure, contrast, focus, labels, motion.

## Phase 8 — Performance pass

Remove unnecessary cost introduced during the redesign.

## Phase 9 — Verification

Run build/tests/type checks where available.

Use browser/device inspection when available.

## Phase 10 — Final zero-skip audit

Compare the final route inventory against the original inventory.

Every route must have a status:

```text
IMPROVED
VERIFIED
BLOCKED
NOT APPLICABLE
```

Never leave an undocumented route.

---

# 35. REQUIRED PAGE INVENTORY FORMAT

Maintain an internal table like:

```text
| # | Route | Role | Purpose | Components | States | Mobile | Tablet | Desktop | A11y | Performance | Status |
```

Example:

```text
| 01 | /admin | Admin | Overview | Dashboard, Chart, Cards | L/E/Err | ✓ | ✓ | ✓ | ✓ | ✓ | VERIFIED |
```

Use the actual application routes, not imaginary routes.

---

# 36. CHANGE PRIORITY

When many issues exist, prioritize in this order:

1. Broken functionality
2. Security/privacy issues
3. Accessibility blockers
4. Navigation/usability blockers
5. Responsive failures
6. Major hierarchy problems
7. Design-system inconsistency
8. Performance issues
9. Interaction quality
10. Micro-polish

Do not spend 20 minutes perfecting a shadow while the mobile navigation is broken.

---

# 37. DO NOT OVER-REFACTOR

Do not rewrite the whole application merely because the code is imperfect.

Prefer incremental, safe improvements.

Refactor when:

- it eliminates repeated problems
- it improves maintainability
- it enables consistent UI
- it reduces bugs
- it makes the design system possible

Avoid architecture changes unrelated to the requested quality improvement.

---

# 38. PRESERVE FUNCTIONALITY

Visual improvement must not break:

- authentication
- routing
- forms
- data fetching
- mutations
- permissions
- API calls
- realtime behavior
- uploads
- navigation
- existing business logic

After modifying shared components, inspect every consumer.

---

# 39. VISUAL REGRESSION MINDSET

After modifying shared components, assume multiple pages may have changed.

Re-check:

- buttons
- cards
- inputs
- dialogs
- tables
- navigation
- responsive layouts

Do not assume the change is isolated.

---

# 40. SELF-CRITIQUE LOOP

After implementation, ask:

### Pass 1
Does it work?

### Pass 2
Is it understandable?

### Pass 3
Is it visually coherent?

### Pass 4
Is it responsive?

### Pass 5
Is it accessible?

### Pass 6
Is it fast?

### Pass 7
Does it handle failure?

### Pass 8
Does it feel polished?

### Pass 9
Does it remain consistent with every other page?

### Pass 10
Did anything get skipped?

If any answer is no, continue improving.

---

# 41. ZERO-SKIP REQUIREMENT

Before declaring completion, verify all of the following:

- [ ] All routes discovered
- [ ] All routes audited
- [ ] All pages improved where improvement was warranted
- [ ] All major components audited
- [ ] Shared components checked
- [ ] Typography system checked
- [ ] Spacing system checked
- [ ] Color system checked
- [ ] Navigation checked
- [ ] Forms checked
- [ ] Tables checked
- [ ] Charts checked
- [ ] Dialogs checked
- [ ] Empty states checked
- [ ] Loading states checked
- [ ] Error states checked
- [ ] Success states checked
- [ ] Mobile checked
- [ ] Tablet checked
- [ ] Desktop checked
- [ ] Wide desktop checked
- [ ] Keyboard navigation checked
- [ ] Focus states checked
- [ ] Accessibility checked
- [ ] Reduced motion considered
- [ ] Performance checked
- [ ] Security-sensitive UI checked
- [ ] Content/microcopy checked
- [ ] Build checked
- [ ] Tests checked where available
- [ ] Final route inventory reconciled

If any box is unchecked, DO NOT claim completion.

---

# 42. WHEN TO STOP

Stop only when:

1. Every discovered page has been processed.
2. Shared components have been reviewed.
3. Major inconsistencies have been addressed.
4. Responsive behavior has been checked.
5. Interaction states have been checked.
6. Accessibility has been checked.
7. Performance has been considered.
8. Functional behavior remains intact.
9. Build/tests pass where available.
10. Remaining issues are documented.

"Looks good" is not a completion criterion.

---

# 43. AGENT RESPONSE FORMAT

When reporting work, use:

## Discovery
- routes found
- major architecture
- design-system status

## Audit
- highest-impact issues
- systemic issues
- page-specific issues

## Changes
- system changes
- component changes
- page changes
- responsive changes
- accessibility changes
- performance changes

## Verification
- routes checked
- tests
- build
- browser/device checks
- remaining limitations

## Completion
State whether the complete inventory was verified.

Never say:

> "I improved the app."

without evidence.

Prefer:

> "Discovered 42 routes, audited all 42, updated 31 directly, corrected 7 shared components affecting 26 routes, and verified the final route inventory. Four routes remain blocked because..."

---

# 44. FINAL QUALITY STANDARD

The finished interface should satisfy this mental test:

### Purpose
I understand why this exists.

### Clarity
I know what matters.

### Agency
I know what I can do.

### Familiarity
I understand how it behaves.

### Flexibility
It adapts to my context.

### Simplicity
I can accomplish my goal without unnecessary friction.

### Craft
Every detail feels intentional.

### Delight
The experience feels satisfying without unnecessary decoration.

---

# 45. GOLDEN RULE

Before adding anything, ask:

> Does this help the user?

Before removing anything, ask:

> Does this information help the user?

Before styling anything, ask:

> What hierarchy does this create?

Before creating a component, ask:

> Is this a reusable pattern?

Before creating a new pattern, ask:

> Does an existing pattern already solve this?

Before adding animation, ask:

> What does the motion communicate?

Before making something responsive, ask:

> How should the interaction change, not merely the dimensions?

Before declaring a page finished, ask:

> Have I checked every state and every viewport?

Before declaring the product finished, ask:

> Did I actually inspect every page?

---

# 46. EXECUTION COMMAND

When this skill is invoked against an existing application, execute the following sequence:

```text
1. Inspect the repository.
2. Identify the frontend framework and architecture.
3. Discover every route and entry point.
4. Discover every major component and shared primitive.
5. Build the complete page inventory.
6. Map the main user flows.
7. Identify existing design tokens and patterns.
8. Audit every page.
9. Identify systemic problems.
10. Fix the design system before duplicating fixes.
11. Improve shared components.
12. Improve every page systematically.
13. Check every important interaction state.
14. Check mobile.
15. Check tablet.
16. Check desktop.
17. Check wide desktop.
18. Check accessibility.
19. Check performance.
20. Check functional integrity.
21. Run build/tests.
22. Re-audit every route.
23. Compare the final route inventory against the original.
24. Document anything blocked or unresolved.
25. Only then report completion.
```

Do not skip steps because a page "looks fine."

A page that already looks good still requires verification.

---

# 47. IMPORTANT LIMITATION

This skill is an Apple-inspired quality framework based on publicly available Apple design guidance. It is not Apple's internal design system and does not reproduce confidential Apple processes.

Use Apple's public Human Interface Guidelines as an evolving reference when platform-specific questions arise.

The quality target is:

> intentional product design + familiar interaction + strong hierarchy + flexible layout + accessibility + performance + meticulous craft.

That combination should guide every line of frontend code and every page in the application.


# 47. EXTENDED SIMPLICITY & SPACING REFERENCE

# OLISKEY FRONTEND — SIMPLICITY & SPACING DESIGN CONSTITUTION

## PURPOSE

This is a mandatory design-enforcement layer for the frontend AI agent.

The goal is not to make interfaces decorative.

The goal is to make every screen feel:

- simple
- calm
- spacious
- intentional
- readable
- consistent
- responsive
- premium
- easy to understand

Use Apple's publicly documented design principles as inspiration, but do not copy Apple's proprietary UI, branding, assets, or internal/private design systems.

The primary visual goals are:

> SIMPLICITY + SPACING + HIERARCHY + CONSISTENCY + CRAFT

---

# 1. THE ONE-SENTENCE RULE

Before changing any UI, ask:

> "What is the most important thing the user needs to understand or do on this screen?"

Everything else must support that answer.

If an element competes with it, reduce its:

- size
- contrast
- visual weight
- spacing
- prominence

or remove it if unnecessary.

---

# 2. DO NOT DESIGN SCREEN-BY-SCREEN

Never independently design cards, buttons, sections, or pages.

Design a SYSTEM.

If the application contains:

- 20 cards
- 15 buttons
- 12 forms
- 8 tables

they should still feel like they belong to ONE product.

Before creating a new visual pattern, ask:

> "Does an existing pattern already solve this?"

If yes, reuse it.

If no, determine whether a new pattern is genuinely necessary.

---

# 3. THE SPACING-FIRST RULE

Spacing is not decoration.

Spacing communicates hierarchy.

Use spacing to show:

```text
Related things
    ↓
small gap

Different groups
    ↓
medium gap

Major sections
    ↓
large gap
```

Never use the same spacing everywhere.

Do not randomly use:

```text
13px
17px
19px
23px
27px
31px
```

unless there is a strong reason.

Create a predictable spacing vocabulary.

Preferred starting scale:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Use the smallest spacing for closely related elements.

Use larger spacing to separate concepts.

---

# 4. THE CARD LAW

Cards are not containers for everything.

Before placing something inside a card ask:

> "Does this content actually need a boundary?"

Do NOT automatically put every section inside a card.

Avoid:

```text
Card
 └── Card
      └── Card
           └── Card
```

Prefer:

```text
Page
 ├── Section
 │    ├── Heading
 │    └── Content
 │
 └── Section
      ├── Heading
      └── Content
```

Use cards when they help users understand grouping, interaction, hierarchy, or separation.

---

# 5. AI TOOLS CARD RULE

The AI Tools cards in the reference screenshot reveal a common problem:

They have strong colors but insufficient visual structure.

Do not create cards merely as:

```text
icon
title
description
```

with arbitrary gradients.

Every tool card must answer:

1. What is this?
2. Why should I use it?
3. What can I do with it?
4. What is the interaction?
5. How important is it compared with neighboring tools?

## AI TOOL CARD STRUCTURE

Preferred:

```text
┌──────────────────────────┐
│ icon                     │
│                          │
│ Tool name                │
│ Short useful description │
│                          │
│ → Action                 │
└──────────────────────────┘
```

Or, when appropriate:

```text
┌──────────────────────────┐
│ icon                •••  │
│                          │
│ Tool name                │
│ Supporting text          │
│                          │
│ Open →                   │
└──────────────────────────┘
```

Do not make every card visually loud.

If every card is loud, none is important.

---

# 6. CARD SIZE RULE

Cards must be sized according to content.

Do not make a card extremely narrow simply because two cards must fit beside each other.

Bad:

```text
[ very narrow card ][ very narrow card ][ very narrow card ]
```

if the text becomes:

```text
AI
Study
Buddy
```

and creates unnecessary wrapping.

Prefer:

```text
[        AI Study Buddy        ]
[      AI Adventure Quest      ]
```

or a responsive grid that gives each card enough readable width.

The user should never feel that the content is being squeezed to satisfy the layout.

---

# 7. CARD GRID RULE

Cards in the same collection should normally have:

- consistent width
- consistent padding
- consistent radius
- consistent internal spacing
- consistent title hierarchy
- consistent icon treatment
- consistent action placement

Their content can differ.

Their structural language should not.

Use:

```css
grid-template-columns: repeat(auto-fit, minmax(...));
```

or an equivalent responsive strategy when appropriate.

Do not force fixed widths that cause awkward wrapping.

---

# 8. CARD PADDING

Card padding should create breathing room.

Starting values:

```text
small card:   16–20px
normal card:  20–24px
large card:   24–32px
```

Do not use huge padding simply to make a card appear premium.

The goal is balance.

---

# 9. CARD RADIUS

Use a small number of radius levels.

Example:

```text
small component: 10–12px
standard card:   16–20px
large container: 20–28px
```

Do not randomly mix:

```text
8px
13px
17px
22px
31px
40px
```

throughout the same product.

Consistency matters more than the exact number.

---

# 10. COLOR RESTRAINT

Never make every card a different loud gradient.

Color must communicate hierarchy or meaning.

Use:

- neutral surfaces for most content
- brand/accent color selectively
- semantic colors for states
- stronger color for important actions

If the screen contains:

```text
purple card
blue card
green card
orange card
pink card
red card
```

ask:

> "Is color actually communicating information?"

If not, simplify.

---

# 11. THE 3-LEVEL VISUAL HIERARCHY

Every screen should have:

### Level 1 — Primary

What matters most.

Examples:

- page title
- primary task
- current priority
- main content

### Level 2 — Secondary

What supports the primary information.

Examples:

- section titles
- supporting metrics
- secondary actions

### Level 3 — Tertiary

Useful but quiet information.

Examples:

- metadata
- timestamps
- helper text
- secondary descriptions

Never allow every element to compete at Level 1.

---

# 12. ONE PRIMARY ACTION

Most sections should have one obvious primary action.

Example:

```text
Assignments

[Create assignment]
```

Do not create:

```text
[Create] [Import] [Export] [Share] [Filter] [Settings] [More]
```

at equal visual weight.

Use hierarchy.

---

# 13. BUTTON LAW

Buttons must be:

- understandable
- appropriately sized
- consistent
- accessible
- easy to scan

Do not make buttons huge unless the action requires prominence.

Do not use a filled primary button for every action.

Use:

```text
Primary
Secondary
Tertiary
Destructive
Icon-only
```

appropriately.

---

# 14. BUTTON CONTENT

Use action-oriented labels.

Prefer:

```text
Add student
View results
Save changes
Start quiz
Try again
```

Avoid:

```text
Click here
Continue
Proceed
Submit
More
```

when a more specific label is possible.

---

# 15. ICON LAW

Icons should support comprehension.

Do not add icons because a button looks empty.

Do not use five different icon styles in the same product.

Icons must have:

- consistent stroke/fill language
- consistent optical size
- consistent alignment
- accessible labels when necessary

Icon + text spacing should be consistent.

---

# 16. TYPOGRAPHY LAW

Typography creates hierarchy before decoration.

Use a small number of text styles.

Example:

```text
Display
Page title
Section title
Card title
Body
Secondary
Caption
Metadata
```

Avoid excessive font weights.

Avoid excessive font sizes.

Do not make every heading huge.

---

# 17. LINE LENGTH

Do not allow text blocks to become unnecessarily wide.

Descriptions should remain readable.

Cards should not become giant text containers.

If a description becomes too long:

- shorten the copy
- restructure the content
- use progressive disclosure
- move details to a detail view

Do not solve everything with tiny text.

---

# 18. THE WHITE-SPACE RULE

Empty space is not wasted space.

Whitespace should:

- separate concepts
- establish hierarchy
- improve scanning
- reduce cognitive load
- make important content feel important

However:

> Empty space without purpose is not premium design.

If an enormous empty area exists because the layout was not properly structured, fix it.

---

# 19. ABOVE-THE-FOLD RULE

The first viewport should establish:

1. where the user is
2. what matters
3. what they can do
4. what requires attention

Do not fill the first viewport with every available feature.

Do not force users to scroll simply because the designer wanted a larger hero section.

---

# 20. CONTENT DENSITY

There are three useful density levels:

```text
Compact
Comfortable
Spacious
```

Choose based on task.

Admin tables may need compact density.

Student dashboards may benefit from comfortable/spacious density.

Do not make everything equally dense.

---

# 21. THE SCREEN BALANCE TEST

After designing a page, look at it as a whole.

Ask:

- Is one area too heavy?
- Is one area too empty?
- Are there too many cards?
- Are there too many colors?
- Are there too many buttons?
- Is the title overpowering?
- Is the content squeezed?
- Is the bottom navigation competing with content?
- Is the primary action obvious?

Fix the composition before polishing details.

---

# 22. THE SQUINT TEST

Mentally blur or squint at the page.

You should still be able to identify:

```text
Primary
Secondary
Tertiary
```

If everything has the same visual weight, hierarchy is broken.

---

# 23. THE 5-SECOND TEST

Pretend the user opens the screen for five seconds.

Can they answer:

- What screen am I on?
- What is important?
- What can I do?
- What needs my attention?

If not, simplify the hierarchy.

---

# 24. THE 3-SECOND BUTTON TEST

A user should understand the purpose of a primary action almost immediately.

If the button requires surrounding explanation to understand it, improve the label or context.

---

# 25. RESPONSIVE SPACING

Spacing must adapt.

Do not simply scale everything down.

Example:

Desktop:

```text
Page padding: 48px
Section gap: 48px
Card padding: 24px
```

Mobile:

```text
Page padding: 20px
Section gap: 32px
Card padding: 20px
```

The exact values can differ by product.

The principle is:

> Preserve relationships, not fixed measurements.

---

# 26. MOBILE CARD RULE

On mobile:

- cards should have enough width to breathe
- text should not be unnecessarily wrapped
- actions should remain accessible
- cards should not become tiny tiles
- horizontal scrolling should be intentional
- important information should remain visible

Never shrink desktop cards until they become awkward mobile cards.

Recompose.

---

# 27. SECTION LAW

A section should normally have:

```text
Heading
Supporting context (when useful)
Content
```

Do not add a heading merely because a group exists.

Headings should help navigation and scanning.

---

# 28. SCROLL LAW

Scrolling should reveal information progressively.

Avoid:

- huge blank spaces
- unnecessary horizontal scrolling
- nested scrolling unless necessary
- sticky elements covering content
- fixed elements obscuring actions

When using sticky UI, ensure content can still be reached.

---

# 29. NAVIGATION LAW

Navigation must remain visually stable.

Users should understand:

- current location
- available destinations
- how to return
- what is primary

Do not continuously change navigation patterns between pages.

---

# 30. BOTTOM NAVIGATION LAW

For mobile bottom navigation:

- use a small number of high-value destinations
- keep labels clear
- maintain consistent icon placement
- clearly show the active destination
- don't place unrelated actions inside navigation

A floating action button must not compete with the bottom navigation.

---

# 31. FLOATING ACTION BUTTON LAW

A floating action button must represent one meaningful primary action.

If it is merely decorative, remove it.

Check:

- touch target
- safe area
- overlap
- z-index
- navigation competition
- accessibility
- responsive positioning

---

# 32. THE "REMOVE 20%" RULE

After the first design pass:

Look for 20% of the UI that can be removed without reducing functionality.

Candidates:

- duplicate labels
- redundant cards
- decorative icons
- unnecessary borders
- repeated information
- excessive buttons
- unnecessary descriptions
- excessive badges
- redundant headings

Then evaluate whether removal improves clarity.

Do not remove functionality merely to achieve visual minimalism.

---

# 33. THE "DO NOT SHRINK" RULE

When a component does not fit:

DO NOT immediately:

- reduce font size
- reduce padding to 4px
- make icons tiny
- compress buttons
- hide important information

Instead consider:

1. remove unnecessary content
2. change layout
3. stack content
4. allow wrapping
5. move secondary content
6. change component composition

Preserve usability before density.

---

# 34. THE "ONE SYSTEM" RULE

All pages must share:

- spacing vocabulary
- typography vocabulary
- color vocabulary
- radius vocabulary
- button behavior
- input behavior
- card behavior
- navigation behavior
- motion behavior
- state behavior

If a new screen looks like it belongs to a different application, fix it.

---

# 35. EVERY PAGE MUST PASS THESE CHECKS

## Simplicity
- Is the purpose clear?
- Is unnecessary UI removed?
- Is the primary task obvious?

## Spacing
- Are related elements close?
- Are unrelated groups separated?
- Is the page breathing?

## Hierarchy
- Is there a clear primary?
- Are secondary elements quieter?
- Is metadata restrained?

## Cards
- Are cards actually necessary?
- Are cards large enough?
- Are cards structurally consistent?

## Buttons
- Is there one primary action?
- Are secondary actions visually subordinate?
- Are labels specific?

## Typography
- Is the hierarchy clear?
- Is text readable?
- Is wrapping intentional?

## Color
- Is color meaningful?
- Is the screen too colorful?
- Are semantic colors consistent?

## Responsive
- Does it work at small widths?
- Does content remain readable?
- Does layout recompose?

## Accessibility
- Can it be used by keyboard?
- Is focus visible?
- Are controls labeled?
- Is contrast sufficient?
- Is motion respectful?

## States
- loading
- empty
- error
- success
- disabled
- focus
- selected
- pressed

---

# 36. AI AGENT BEHAVIOR

When asked to improve a frontend:

DO NOT immediately write code.

First:

```text
INSPECT
↓
UNDERSTAND
↓
INVENTORY
↓
AUDIT
↓
DESIGN SYSTEM
↓
PLAN
↓
IMPLEMENT
↓
VERIFY
↓
RE-AUDIT
```

---

# 37. MANDATORY PAGE-BY-PAGE PROCESS

For every discovered route:

```text
1. Understand the purpose.
2. Identify primary user action.
3. Identify primary information.
4. Identify secondary information.
5. Identify all components.
6. Check spacing.
7. Check hierarchy.
8. Check typography.
9. Check color.
10. Check card usage.
11. Check buttons.
12. Check states.
13. Check responsive behavior.
14. Check accessibility.
15. Check performance.
16. Improve it.
17. Verify it.
18. Mark it complete.
```

Do this for EVERY route.

No exceptions.

---

# 38. SHARED COMPONENT RULE

If the same issue appears on multiple pages:

DO NOT patch every page individually.

Find the shared source.

Example:

If 14 pages have bad buttons:

```text
Do not:
Page 1 → patch
Page 2 → patch
Page 3 → patch
...
```

Instead:

```text
Button primitive
      ↓
Fix system
      ↓
All consumers improve
      ↓
Re-test affected pages
```

---

# 39. VISUAL REGRESSION RULE

Every shared component change requires checking its consumers.

Changing:

```text
Button
Card
Input
Modal
Navigation
Typography
Spacing
```

may affect many screens.

Never assume it only affects the page currently open.

---

# 40. ZERO-SKIP COMPLETION PROTOCOL

Before saying "done", create a final inventory.

Every route must have:

```text
AUDITED
IMPROVED
RESPONSIVE
ACCESSIBLE
VERIFIED
```

or a documented reason why it is blocked.

Never silently skip:

- settings
- profile
- authentication
- onboarding
- modals
- dialogs
- forms
- detail pages
- error pages
- empty pages
- secondary navigation
- rarely used routes

---

# 41. DO NOT USE THESE AS SHORTCUTS

Do not claim quality because:

- the screenshot looks good
- the homepage looks good
- the dashboard looks good
- the code compiles
- a design library was installed
- a gradient was added
- animations were added
- Apple-like colors were used

Quality requires system-wide verification.

---

# 42. REFERENCE IMAGE ANALYSIS RULE

When the user provides a design reference:

Do NOT copy the image literally.

Extract the principles:

- spacing
- hierarchy
- scale
- density
- composition
- typography
- interaction emphasis
- card structure
- navigation structure
- visual restraint

Then apply those principles to the existing product's own identity and content.

---

# 43. REFERENCE SCREENSHOT OBSERVATION

For a dashboard similar to the supplied student-dashboard reference:

The useful qualities are:

- clear page identity
- strong primary section
- generous outer margins
- strong primary task
- restrained navigation
- obvious active navigation
- large readable titles
- clear card hierarchy
- simple grouping
- visually separated sections
- clear primary action

Do NOT blindly copy:

- exact colors
- exact gradients
- exact card dimensions
- exact typography
- exact icons
- exact navigation
- exact layout

Instead reproduce the underlying design principles.

---

# 44. AI TOOLS SECTION — SPECIFIC RULE

If a screen contains multiple AI tools, do not make every tool look like a marketing banner.

Treat them as a coherent product collection.

Preferred hierarchy:

```text
AI Tools
Short explanation

[ Tool ] [ Tool ]
[ Tool ] [ Tool ]
```

Cards should share:

- structure
- spacing
- icon placement
- title style
- description style
- interaction model

Color variation should be restrained.

If there are many tools, consider:

- category
- search
- filters
- featured tool
- compact list
- grid
- detail page

Do not solve information architecture with increasingly colorful cards.

---

# 45. "PREMIUM" DOES NOT MEAN MORE EFFECTS

Premium quality comes from:

- precision
- consistency
- restraint
- speed
- clarity
- hierarchy
- typography
- spacing
- interaction quality

NOT from:

- more gradients
- more shadows
- more animations
- more glass
- more colors
- more rounded corners
- more cards

---

# 46. FINAL QUESTION BEFORE EVERY UI CHANGE

Ask:

> "Will this make the user's task clearer, easier, faster, or more understandable?"

If the answer is no:

Do not add it.

---

# 47. FINAL DESIGN STANDARD

The finished page should feel like:

```text
Nothing unnecessary.
Nothing confusing.
Nothing accidentally aligned.
Nothing randomly colored.
Nothing squeezed.
Nothing competing without purpose.
Nothing important hidden.
Nothing interactive without feedback.
Nothing responsive by accident.
Nothing inaccessible by neglect.
Nothing inconsistent with the rest of the product.
```

The goal is not to make the interface empty.

The goal is to make every remaining element feel necessary.

---

# 48. FINAL AGENT COMMAND

When this skill is active, the agent must treat every existing page as unfinished until it has been audited.

The agent must:

1. discover every page
2. inspect every page
3. identify systemic issues
4. establish consistent design tokens
5. improve shared components
6. improve every page
7. check every state
8. check every viewport
9. check accessibility
10. check performance
11. verify functionality
12. re-audit everything
13. document blockers
14. never silently skip a page

The final standard is:

> SIMPLE ENOUGH TO UNDERSTAND.
> SPACIOUS ENOUGH TO BREATHE.
> CONSISTENT ENOUGH TO FEEL LIKE ONE PRODUCT.
> PRECISE ENOUGH TO FEEL CRAFTED.


# 48. FINAL ALWAYS-ON ENFORCEMENT

The sections above are cumulative, not alternatives.

For every frontend task, apply the strongest applicable rule from this entire
skill. Never select only the easiest subset.

If a page already looks good, still verify it.

If a component already looks good, still verify its states and consumers.

If the user asks for a single-screen change, check whether the shared component
or design token affects other screens.

If the user asks for speed, preserve the design principles while making the
smallest safe change.

If the user asks for a visual style that conflicts with usability, accessibility,
or responsive behavior, preserve the requested aesthetic direction while
resolving the conflict in the least harmful way.

The agent must continuously behave as if this skill is part of the frontend
codebase's permanent design and engineering constitution.

NEVER SILENTLY SKIP.
NEVER DECLARE VERIFIED WITHOUT VERIFYING.
NEVER SACRIFICE SIMPLICITY FOR DECORATION.
NEVER SACRIFICE USABILITY FOR A SCREENSHOT.
NEVER SACRIFICE THE SYSTEM FOR A ONE-OFF PAGE.


# 49. ADAPTIVE LAYOUT & REAL-WORLD INTERACTION RULES

## 49.1 DESKTOP SUCCESS DOES NOT MEAN RESPONSIVE SUCCESS

Never assume a page is complete because the desktop version looks good.

A frontend task is incomplete until the layout has been evaluated at:

- small mobile
- standard mobile
- large mobile
- tablet portrait
- tablet landscape
- laptop
- standard desktop
- wide desktop

The agent must actively look for:

- overflow
- clipped content
- squeezed cards
- oversized controls
- incorrect stacking
- broken grids
- navigation collisions
- sticky-element collisions
- floating-element collisions
- buttons wrapping badly
- inputs becoming unnecessarily wide
- buttons becoming unnecessarily wide
- content disappearing
- excessive whitespace
- insufficient whitespace
- unreadable text
- inaccessible controls
- awkward thumb interaction

## 49.2 RESPONSIVENESS IS RECOMPOSITION, NOT SHRINKING

Never solve mobile by simply reducing desktop dimensions.

Desktop:

```text
Sidebar + content + actions
```

may become mobile:

```text
Header
↓
Content
↓
Primary action
```

A desktop horizontal control group may become:

```text
Desktop:
[Search] [Filter] [Export] [Add]

Mobile:
[Search]
[Filter] [Add]
[Export]
```

or another composition that better supports the user's task.

The correct mobile layout is the one that preserves usability and hierarchy, not the one that preserves the desktop geometry.

---

# 50. CONTROL-SIZE INTELLIGENCE

Controls must be sized according to context.

Do not use one universal button width or height for every situation.

A control may be:

- compact
- standard
- prominent
- full-width
- icon-only
- inline
- floating
- sticky

Choose based on the user's task.

## Desktop

Avoid oversized controls that consume excessive horizontal space.

Bad:

```text
[                    Save Changes                    ]
```

when a compact action would communicate the same thing.

Prefer:

```text
[Save changes]
```

unless the action genuinely deserves strong prominence.

## Mobile

Do not make every button tiny merely because screen width is limited.

Touch interaction needs adequate target size.

The solution is often:

- stack
- reposition
- simplify
- prioritize
- make one action full-width
- move secondary actions into a menu

not simply shrinking everything.

---

# 51. INPUT WIDTH INTELLIGENCE

Inputs should match the information they collect.

Examples:

```text
First name       → short
Email            → medium
Phone            → medium
Search           → flexible
Address          → wider
Description      → large/multiline
Date             → compact
Amount            → compact
```

Do not make every input:

```text
width: 100%;
```

without considering context.

A short field inside a desktop form should not become an enormous empty rectangle.

However, do not make inputs artificially narrow when the user needs to see the entered value.

Use content-aware sizing and responsive constraints.

---

# 52. BUTTON POSITION INTELLIGENCE

A button's position is part of UX.

Do not automatically put every action:

- at the bottom
- at the top
- inside a card
- in a floating button
- beside the title

Choose the position based on the user's task and action frequency.

## Put an action near the top when:

- it starts the primary task
- it creates the main object
- it is needed before reading the content
- it is a page-level action

Example:

```text
Students                         [Add student]
```

## Put an action near the bottom when:

- it completes a form
- it confirms a multi-step task
- it is naturally the final step

Example:

```text
Student information
...
...
[Cancel] [Save student]
```

## Use sticky actions when:

- the task is long
- the action must remain available
- users repeatedly need the action while scrolling
- losing the action would create unnecessary friction

## Use a floating action when:

- there is one obvious frequent primary action
- it is useful across a scrolling context
- it does not obscure content
- it does not compete with navigation

Do not use floating buttons merely because they look modern.

---

# 53. ACTION PRIORITY

Before positioning buttons, classify actions:

```text
Primary
Secondary
Tertiary
Destructive
Contextual
Frequent
Rare
Persistent
One-time
```

Then decide placement.

Example:

```text
Primary + frequent
→ visible and easy to reach

Secondary + occasional
→ nearby but quieter

Rare + contextual
→ overflow/menu

Destructive
→ separated and clearly communicated
```

---

# 54. MOBILE ACTION PLACEMENT

On mobile, ask:

> "Where will the user's thumb naturally reach this action?"

Consider:

- bottom reachability
- hand position
- scroll position
- keyboard visibility
- fixed navigation
- safe-area insets

A critical action should not be placed in an awkward location simply to preserve desktop alignment.

---

# 55. STICKY ACTIONS

Sticky actions can improve real-world usability.

Use them when the action has a persistent relationship to the content.

Examples:

```text
Long form
↓
Sticky bottom:
[Cancel] [Save changes]
```

```text
Checkout
↓
Sticky bottom:
Total
[Continue]
```

```text
Long assessment
↓
Persistent:
[Submit]
```

But verify:

- it does not cover content
- it respects safe areas
- it does not overlap bottom navigation
- it does not cover keyboard input
- it does not create excessive visual weight
- it works with screen readers and keyboard navigation

---

# 56. FLOATING ELEMENT SAFETY

Every floating element must be checked against:

```text
bottom navigation
browser controls
safe areas
keyboard
sticky headers
dialogs
toasts
other floating actions
```

Do not allow:

```text
FAB
+
bottom navigation
+
toast
+
sticky button
```

to occupy the same physical region.

If two persistent controls compete for the same location, redesign the interaction.

---

# 57. HEADER ACTION INTELLIGENCE

Do not fill the header with controls just because there is horizontal space.

Header actions should be limited to:

- high-frequency
- page-level
- contextual
- essential

Secondary actions can move to:

- overflow menus
- contextual menus
- detail views

The header should remain calm.

---

# 58. FORM ACTION INTELLIGENCE

Form actions should follow the user's mental sequence.

Typical:

```text
Fields
↓
Review
↓
[Cancel] [Save]
```

Do not put the primary completion action at the top unless the workflow specifically benefits from it.

For long forms, consider:

- sticky action bars
- section navigation
- autosave where appropriate
- progress indicators

---

# 59. CONTEXTUAL ACTIONS

Actions should appear near the thing they affect.

Example:

```text
Student
 ├── Name
 ├── Status
 └── [Edit]
```

rather than forcing the user to search elsewhere for the edit action.

For table rows:

```text
Michael | JSS3 | Active | •••
```

Use an overflow menu for rare row actions rather than filling every row with multiple buttons.

---

# 60. ACTION DENSITY

A page with too many visible actions creates cognitive load.

Before adding a button ask:

> Does the user need this action visible at this exact moment?

If not:

- move it into context
- use an overflow menu
- place it on a detail page
- make it secondary
- remove it

---

# 61. CONTENT-DRIVEN LAYOUT

Never assume content length.

Test:

- short title
- normal title
- very long title
- short description
- long description
- long user name
- translated text
- missing image
- missing metadata

The layout must remain usable.

Never design around the assumption that:

```text
"AI Study Buddy"
```

will always fit on one line.

---

# 62. GRID INTELLIGENCE

Do not choose a grid simply because a framework makes it easy.

For every grid ask:

- How wide does each item need to be?
- How much text does each item contain?
- Is comparison important?
- Does the user scan horizontally or vertically?
- How does it collapse?
- What happens at intermediate widths?

A 4-column desktop grid may become:

```text
desktop: 4
tablet: 2
mobile: 1
```

But that is only a starting pattern.

If cards become too narrow at 4 columns, use 3.

If two columns are still too narrow on mobile landscape, use 1.

Content determines the grid.

---

# 63. BREAKPOINT INTELLIGENCE

Do not choose breakpoints solely from device names.

Choose them when the layout starts to fail.

The breakpoint should answer:

> "At what width does this composition stop being comfortable?"

Use CSS/container-query techniques where appropriate.

Avoid excessive breakpoint rules.

Prefer fluid behavior between meaningful layout changes.

---

# 64. INTERMEDIATE WIDTH TEST

Do not test only:

```text
375px
768px
1440px
```

Also inspect widths between them.

Many responsive bugs happen between standard device breakpoints.

Test representative intermediate widths to catch:

- awkward wrapping
- grid collapse too late
- buttons colliding
- navigation overflow
- excessive whitespace
- cards becoming too narrow

---

# 65. ORIENTATION TEST

Where relevant, check:

- portrait
- landscape

especially for:

- tablets
- mobile forms
- media
- dashboards
- tables
- navigation

---

# 66. REAL-WORLD USER EXPERIENCE TEST

Do not evaluate only from a centered desktop screenshot.

Ask:

### Can the user reach the action?

### Can they understand it?

### Can they tap it comfortably?

### Can they see what they typed?

### Can they scroll without losing context?

### Can they recover from an error?

### Can they complete the task with one hand where appropriate?

### Does the interface still work when content is unexpected?

This is the difference between visual design and product design.

---

# 67. DESKTOP COMFORT RULE

Desktop interfaces have more space, but more space does not mean everything should become larger.

Do not automatically increase:

- button width
- input width
- font size
- card size
- spacing

on large screens.

Use additional space to improve:

- breathing room
- grouping
- readable content width
- multi-column organization
- contextual information

rather than creating giant controls.

---

# 68. MOBILE COMFORT RULE

Mobile has less space, but less space does not mean everything should become smaller.

Do not automatically reduce:

- touch targets
- text
- line height
- action spacing
- icon size

Instead reduce complexity through:

- hierarchy
- stacking
- progressive disclosure
- contextual menus
- navigation changes
- content prioritization

---

# 69. RESPONSIVE DECISION CHECKLIST

For every major component ask:

```text
Width:
Does it fit?

Height:
Can content grow?

Text:
What happens when it wraps?

Actions:
Where should they live?

Navigation:
What changes?

Touch:
Can it be comfortably used?

Keyboard:
Can it be operated?

Overflow:
What happens when content is too large?

State:
Do loading/error/empty states still fit?

Floating:
Does it collide with another persistent element?
```

---

# 70. RESPONSIVE COMPLETION RULE

A page is NOT considered responsive merely because:

- CSS media queries exist
- the page technically fits
- there is no horizontal scrollbar

It is responsive only when:

> The layout, hierarchy, controls, actions, and interactions remain comfortable and understandable across the relevant environments.

---

# 71. EXISTING FRONTEND DECISION FRAMEWORK

When an existing frontend is discovered, NEVER automatically rebuild it.

First classify:

```text
KEEP + POLISH
IMPROVE
REFACTOR
RECREATE
REBUILD
REMOVE
```

### KEEP + POLISH

Use when:

- architecture is sound
- UX is sound
- layout is sound
- visual quality needs refinement

### IMPROVE

Use when:

- functionality is good
- structure is good
- visual hierarchy or responsive behavior needs work

### REFACTOR

Use when:

- UI patterns are duplicated
- components are inconsistent
- design tokens are missing
- implementation is unnecessarily complex

### RECREATE

Use when:

- information architecture is fundamentally wrong
- the current page cannot support the desired user flow
- responsive behavior requires a different composition

### REBUILD

Use only when:

- the architecture prevents the required experience
- technical constraints make safe improvement unreasonable
- major security/performance/maintainability problems require it

### REMOVE

Use when:

- the feature provides no meaningful user value
- it is redundant
- it creates unnecessary complexity

---

# 72. PRESERVE EXISTING VALUE

Before replacing an existing page, identify what is already valuable:

- business rules
- working flows
- edge cases
- API integration
- real content
- permissions
- existing accessibility
- tested interactions
- user expectations

Do not throw away useful behavior simply because the visual design is weak.

---

# 73. REBUILD DECISION QUESTIONS

Before recreating a page, ask:

1. Is the information architecture wrong?
2. Is the primary user flow wrong?
3. Is the component architecture preventing consistency?
4. Is responsive behavior fundamentally broken?
5. Is performance fundamentally limited by the implementation?
6. Is security fundamentally compromised?
7. Would incremental changes create more complexity than replacement?

If most of these are false:

> Improve the existing page.

---

# 74. START-FROM-SCRATCH PROCESS

If there is no frontend:

```text
Product understanding
↓
Users
↓
User goals
↓
Information architecture
↓
User flows
↓
Design principles
↓
Design tokens
↓
Component primitives
↓
Representative screen
↓
Responsive system
↓
States
↓
Full page system
↓
Verification
```

Do not start by generating dozens of pages.

Establish the system first.

---

# 75. REPRESENTATIVE SCREEN RULE

When starting from scratch, build enough of one representative screen to prove:

- typography
- spacing
- buttons
- cards
- forms
- navigation
- responsive behavior
- states
- accessibility
- motion

Then scale the system.

---

# 76. "NEW IS NOT BETTER" RULE

Never equate:

```text
new
=
better
```

Instead:

```text
KEEP good work
IMPROVE weak work
REFACTOR inconsistent work
RECREATE fundamentally broken work
REBUILD only when justified
REMOVE unnecessary work
```

---

# 77. MASTER RESPONSIVE QUALITY TEST

Before completing ANY frontend task, inspect:

```text
Desktop
↓
Does the interface feel appropriately sized?

Tablet
↓
Does the composition still work?

Mobile
↓
Does the hierarchy remain clear?

Small mobile
↓
Does anything become cramped?

Intermediate widths
↓
Does anything break between breakpoints?

Touch
↓
Can actions be comfortably reached?

Keyboard
↓
Can actions be reached and understood?

Long content
↓
Does the layout survive?

Large data
↓
Does the interface remain usable?

Loading/error/empty
↓
Does the composition remain coherent?
```

Only then mark the frontend work complete.


# 77. APPLE-GROUNDED DESIGN INTENT — VERIFIED PUBLIC PRINCIPLES

This section is grounded in Apple's current public Human Interface Guidelines,
including the June 2026 design-principles guidance.

Official references:
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/inclusion
- https://developer.apple.com/design/human-interface-guidelines/buttons
- https://developer.apple.com/design/human-interface-guidelines/branding
- https://developer.apple.com/design/human-interface-guidelines

These references are the source of the principles below. Do not invent claims
about Apple's private internal design process.

## 77.1 PURPOSE

Design with intention.

Identify what matters most to the person using the product.

The AI must ask:

- What is the user's goal?
- What deserves attention?
- What is unnecessary?
- What should be immediate?
- What can be secondary?

Do not optimize a screen for visual novelty at the expense of the user's goal.

## 77.2 AGENCY

The user should understand and control what happens.

Provide:

- clear actions
- clear feedback
- predictable navigation
- reversible actions when possible
- understandable permissions
- safe recovery
- visible progress

Do not surprise users with unexplained behavior.

## 77.3 RESPONSIBILITY

Treat:

- time
- attention
- privacy
- data
- accessibility
- trust

as product resources.

Do not ask for information that is unnecessary.

Do not create friction merely to make a flow appear sophisticated.

## 77.4 FAMILIARITY

Use recognizable patterns.

Once the product establishes a behavior, reuse it.

If a button behaves one way on one page, equivalent buttons should behave
similarly elsewhere.

Familiarity should reduce the need for explanation.

## 77.5 FLEXIBILITY

The interface must adapt to:

- different screen sizes
- orientations
- input methods
- accessibility settings
- content lengths
- languages
- user abilities
- device capabilities

Preserve the user's context as the layout changes.

Do not allow responsive adaptation to make the product feel like a completely
different application.

## 77.6 SIMPLICITY

Apple's public guidance explicitly distinguishes simplicity from minimalism.

Therefore:

DO NOT interpret simplicity as:

- fewer features at any cost
- empty screens
- tiny amounts of information
- removing useful context
- hiding everything behind menus

Interpret simplicity as:

- clear purpose
- concise language
- logical organization
- recognizable controls
- strong hierarchy
- unnecessary elements removed
- important things kept close
- secondary things allowed to fall away

## 77.7 CRAFT

Craft means the AI must care about details:

- alignment
- spacing
- wording
- motion
- transitions
- icon placement
- states
- responsive behavior
- accessibility
- performance
- error recovery

Do not stop at "technically works."

## 77.8 DELIGHT

Delight should be a consequence of thoughtful design.

Do not add random confetti, excessive gradients, unnecessary animations, or
decorative effects merely to manufacture delight.

Create delight through:

- confidence
- smoothness
- clarity
- responsiveness
- thoughtful feedback
- easy recovery
- appropriate personality
- satisfying interactions

---

# 78. UNIVERSAL / AGE-INCLUSIVE SIMPLICITY

The interface must be usable by someone regardless of age, technical experience,
or familiarity with the product.

This is a HARD REQUIREMENT.

The product should not assume that the user:

- understands software terminology
- knows common shortcuts
- understands icons without context
- knows hidden gestures
- knows where a feature is located
- understands technical errors
- has used similar software before

The first interaction should be understandable without training whenever
reasonably possible.

## 78.1 THE CHILD-TO-ELDER TEST

Evaluate important flows from three perspectives:

### Young or inexperienced user

Can they understand:

- what this page is
- what they can do
- what the button means
- what happens next

without technical knowledge?

### Typical adult user

Can they complete the task quickly without unnecessary explanation?

### Older or less technically experienced user

Can they read the interface comfortably?

Can they identify controls?

Can they understand feedback?

Can they recover from mistakes?

Can they use the interface without relying on tiny targets or hidden gestures?

If a flow fails any of these tests, simplify it.

This does NOT mean making the interface childish.

It means making the interface universally understandable.

## 78.2 DO NOT REQUIRE TRAINING FOR BASIC TASKS

A user should not need a tutorial to understand:

- Add
- Save
- Search
- Back
- Edit
- Delete
- Cancel
- Close
- Continue
- Try again
- View
- Submit

Use familiar patterns and precise labels.

## 78.3 ICON + LABEL RULE

If an icon is ambiguous, provide a text label.

Do not assume that every user understands an unfamiliar symbol.

Tooltips can supplement an interface, but tooltips must not be the only way
to discover an essential action.

## 78.4 ERROR LANGUAGE

Never require technical knowledge to recover from an error.

Avoid:

```text
Error 500
TypeError
Null reference
Network exception
```

as the primary user-facing explanation.

Prefer:

```text
We couldn't save your changes.

Check your connection and try again.
```

Technical details can be available for diagnostics without becoming the user's
responsibility.

## 78.5 COGNITIVE SIMPLICITY

Reduce:

- unnecessary decisions
- unfamiliar terminology
- simultaneous choices
- hidden dependencies
- memory requirements
- time pressure

Prefer recognition over recall.

Prefer visible context over requiring the user to remember previous screens.

---

# 79. UNIVERSAL READABILITY

The AI must design for changing vision, attention, and reading comfort.

Check:

- text size
- line height
- contrast
- text wrapping
- content width
- focus
- zoom
- larger text
- high contrast where supported
- reduced motion
- color independence

Do not use small text as a layout repair technique.

Do not assume every user sees the interface under ideal lighting or at ideal
screen brightness.

---

# 80. UNIVERSAL INPUT

The same task should be possible through appropriate input methods where the
platform supports them.

Consider:

- touch
- mouse
- keyboard
- screen reader
- voice
- switch/control access
- other assistive input

Do not create a critical task that only works through hover.

Do not create a critical task that only works through a hidden gesture.

Do not create a critical task that requires precise pointing when a simpler
interaction is possible.

---

# 81. CONTEXT PRESERVATION

When a layout adapts, the user should remain oriented.

Preserve:

- current location
- selected item
- task state
- important content
- navigation context
- meaningful actions

If a desktop layout becomes a mobile layout, the user should not feel that
they have entered a completely different product.

Responsive adaptation should change composition while preserving meaning.

---

# 82. APPLE-INSPIRED LAYOUT LOGIC

Use layout to communicate relationships.

Group related content.

Separate unrelated content.

Give important content enough space.

Use alignment to establish hierarchy.

Use progressive disclosure when content cannot all be presented at once.

Do not crowd essential information with secondary controls.

Do not confuse a visually dense page with an information-rich page.

---

# 83. BUTTON QUALITY — SOURCE-GROUNDED RULES

For every button, verify:

### Purpose
Can the user tell what it does?

### Content
Does the label or symbol communicate the action?

### Role
Does its visual treatment communicate its importance?

### Target
Is there enough interactive area?

### Separation
Can users distinguish it from neighboring controls?

### State
Does it have visible pressed/focus/disabled/loading behavior?

### Placement
Is it located where the task naturally calls for it?

### Context
Is it competing with too many other actions?

Apple's current public button guidance specifically emphasizes recognizable
purpose, sufficient space around controls, press states, and appropriate
visual hierarchy.

For web implementations, translate those principles into the appropriate
platform conventions rather than blindly copying point values from Apple
platforms.

---

# 84. LAYOUT QUALITY — SOURCE-GROUNDED RULES

The AI must verify:

- grouping
- negative space
- alignment
- content priority
- progressive disclosure
- control spacing
- safe areas where applicable
- responsive adaptation
- text width
- orientation changes
- localization effects

The interface should remain recognizable and coherent as its available space
changes.

---

# 85. ACCESSIBILITY IS NOT A SPECIAL MODE

Do not create a "normal UI" and then bolt accessibility onto it.

Accessibility should influence the original design.

Design for:

- larger text
- readable contrast
- keyboard
- touch
- screen readers
- reduced motion
- cognitive simplicity
- clear feedback

A simpler interface generally benefits everyone.

---

# 86. APPROACHABILITY RULE

The product should be approachable to someone who has never used it.

At the same time, experienced users should be able to become faster without
being forced through unnecessary tutorials.

Therefore:

```text
First use
→ obvious path

Repeated use
→ faster path

Expert use
→ optional shortcuts / advanced controls
```

Do not punish beginners.

Do not slow down experienced users unnecessarily.

---

# 87. EXPLANATION-FREE BASIC INTERACTION

The AI must attempt to make ordinary interaction self-explanatory.

A user should not need a manual to understand:

- navigation
- primary actions
- forms
- common controls
- status
- errors
- basic search
- basic filtering

When explanation is necessary, prefer contextual guidance close to the
relevant action.

Do not force users through a long tutorial before allowing them to use the
product.

---

# 88. THE AGE-INCLUSIVE REVIEW

For every major user flow, ask:

> "Could a technically inexperienced child, a typical adult, and an older
> person understand the next action without someone standing beside them?"

If no:

1. simplify the wording
2. improve hierarchy
3. make the control more recognizable
4. improve spacing
5. increase clarity
6. remove unnecessary decisions
7. provide contextual help only if still needed

Never make the UI childish.

The goal is universal clarity.

---

# 89. SOURCE-BASED DESIGN DECISION RULE

When making a major design decision based on "Apple style", do not rely on
memory or vague aesthetic assumptions.

First determine whether the decision is supported by Apple's public HIG.

If it is:

- use the principle

If it is platform-specific:

- adapt it to the actual platform being built

If it is not supported by Apple's public guidance:

- treat it as a general design-system decision, not an "Apple rule"

Never invent an "Apple rule" to justify a design choice.

---

# 90. EVIDENCE HIERARCHY

When deciding frontend behavior, use this priority:

```text
1. User needs and product goals
2. Accessibility and safety
3. Platform conventions
4. Existing product consistency
5. Apple public HIG principles
6. Design-system consistency
7. Visual preference
```

Aesthetic preference must not override usability.

---

# 91. APPLE-INSPIRED DOES NOT MEAN IPHONE-CLONED

Do not automatically import:

- iOS navigation into a web dashboard
- iOS-specific gestures into desktop web
- Apple-specific materials into every card
- Apple-specific iconography
- Apple-specific typography
- Apple-specific visual effects

Instead import the underlying principles:

- clarity
- purpose
- familiarity
- flexibility
- simplicity
- craft
- delight
- responsibility
- agency

---

# 92. FINAL UNIVERSAL PRODUCT TEST

Before considering a major frontend experience complete:

### First-time test
Can someone understand the basic flow without training?

### Young/inexperienced test
Are the words and interactions understandable?

### Experienced test
Can the user move quickly without unnecessary friction?

### Older-user test
Is it readable, forgiving, and easy to operate?

### Accessibility test
Can people with different capabilities use it?

### Responsive test
Does the composition remain coherent?

### Error test
Can the user recover?

### Stress test
What happens with long text, large data, slow network, empty data, and
unexpected states?

If the experience only works for a technically experienced developer on a
large desktop monitor, it is not finished.

# OLISKEY PRODUCT MEMORY, EXTRA-ACTION & MULTI-AGENT CONSTITUTION

## Extra-action principle
Do not optimize for the fewest clicks. Optimize for the fewest confusing decisions. A deliberate extra action is preferred when it makes the task clearer, safer, more accessible, or less cognitively demanding. Never add steps merely to imitate Apple.

## Approved design is locked
When the user says a screen, component, button, card, color, layout, or pattern is approved/final/satisfactory/"don't touch it", treat it as LOCKED. Never redesign it for aesthetics without permission. Only critical functional, security, accessibility, or blocking technical issues justify an unapproved change. Preserve the approved visual language and explain necessary exceptions.

## Product memory / self-updating style
Learn the user's style from explicit decisions, not guesses. When a reusable pattern is explicitly approved, record it in the repository design source of truth when practical (for example docs/design-system.md or docs/approved-patterns.md) and reuse it consistently. Do not over-generalize one isolated preference into a global rule.

## Two-agent minimum
For meaningful frontend work, use at least two coordinated agents:
- BUILDER: inspects, plans, implements, preserves approved design, and documents changes.
- VERIFIER: independently tests the SAME task/screen against the SAME requirements and may reject the work.

Do not satisfy this requirement by assigning different screens to different agents. For one task, both agents work on the same screen/feature slice.

Required loop: PLAN → BUILDER → VERIFIER → FIX → VERIFIER → PASS. If verification fails, the task is not complete.

## Verification gate
The verifier checks visual hierarchy, spacing, typography, colors, buttons, cards, forms, interactions, loading/empty/error/success states, responsive widths, accessibility, runtime/build/test health, preserved business logic, and locked-design protection.

## Universal simplicity
The interface must be understandable by users with widely different ages and technical experience without someone explaining basic interactions. Use plain language, familiar controls, strong hierarchy, progressive disclosure, predictable placement, visible feedback, and sufficient touch/keyboard targets. Keep it professional, never childish.

## Completion standard
Never claim "done", "fully complete", or "production ready" until the relevant verification loop passes. Report inspected scope, changes, verification evidence, failures, and remaining blockers.
