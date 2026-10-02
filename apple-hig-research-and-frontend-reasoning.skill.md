---
name: apple-hig-research-and-frontend-reasoning
description: >
  Research-grounded reference skill for applying Apple's publicly documented
  Human Interface Guidelines to frontend design decisions. Use alongside the
  Oliskey always-on frontend skill. This file distinguishes verified Apple
  principles from general frontend conventions and prevents the agent from
  inventing "Apple rules."
version: 1.0.0
---

# APPLE HIG RESEARCH & FRONTEND REASONING

## 1. SOURCE OF TRUTH

Use Apple's current public Human Interface Guidelines as the primary Apple
reference:

https://developer.apple.com/design/human-interface-guidelines

Key public areas:

- Design principles
- Accessibility
- Layout
- Typography
- Color
- Inclusion
- Motion
- Privacy
- Writing
- Buttons
- Navigation and search
- Toolbars
- Components
- Inputs

Never claim that these public documents reveal Apple's private internal design
process.

---

# 2. VERIFIED DESIGN PRINCIPLES

Apple's current public design-principles guidance identifies:

- Purpose
- Agency
- Responsibility
- Familiarity
- Flexibility
- Simplicity
- Craft
- Delight

Treat these as decision-making principles rather than a rigid visual recipe.

---

# 3. PURPOSE

Design begins with intention.

Frontend implication:

- identify the user's most important goal
- prioritize useful information
- remove irrelevant decoration
- make meaningful features great
- avoid adding features simply because they can be added

Question:

> What matters most to the person using this screen?

---

# 4. AGENCY

Users should feel in control.

Frontend implication:

- make actions clear
- communicate state changes
- make destructive actions understandable
- provide recovery
- preserve context
- avoid surprising navigation
- explain permissions and consequential behavior

---

# 5. RESPONSIBILITY

Products consume people's time, attention, trust, and data.

Frontend implication:

- minimize unnecessary friction
- communicate what data is being requested
- avoid deceptive patterns
- protect sensitive information
- make consequences understandable
- provide meaningful recovery

---

# 6. FAMILIARITY

People bring knowledge from the real world and other software.

Frontend implication:

- use familiar controls
- use recognizable labels
- maintain consistent behavior
- don't reinvent common interactions without a reason
- establish a pattern once and reuse it

Consistency reduces learning cost.

---

# 7. FLEXIBILITY

People use products in diverse contexts.

Apple's public guidance specifically discusses:

- different devices
- different interaction methods
- accessibility needs
- orientations
- Dynamic Type/text-size changes
- localization
- different configurations

Frontend implication:

Do not build only for one viewport.

Do not build only for mouse.

Do not build only for one content length.

Do not build only for one language.

---

# 8. SIMPLICITY

Apple explicitly states that simplicity is not the same as minimalism.

Frontend implication:

Good simplicity means:

- clear purpose
- concise language
- recognizable controls
- logical organization
- hierarchy
- necessary information retained
- unnecessary information removed

Bad "minimalism" can hide functionality.

Do not use empty space as a substitute for good information architecture.

---

# 9. CRAFT

Craft is the attention paid to details.

Frontend implication:

Inspect:

- alignment
- spacing
- typography
- wording
- icons
- transitions
- states
- responsive behavior
- accessibility
- performance

Do not stop at functional correctness.

---

# 10. DELIGHT

Apple's public guidance frames delight as human, satisfying, and enriching.

Do not equate delight with visual effects.

Good delight can come from:

- fast response
- clear feedback
- graceful transitions
- forgiveness
- useful defaults
- thoughtful microcopy
- confidence
- appropriate personality

---

# 11. APPROACHABILITY / INCLUSION

Apple's public inclusion guidance says an approachable app should not require
people to have particular skills or knowledge before using it.

Frontend implication:

The first-use experience should be understandable without unnecessary
training.

Provide:

- straightforward interface
- familiar controls
- clear path
- contextual guidance when needed
- ability to skip unnecessary onboarding
- progressive learning

A beginner should be able to start.

An experienced user should be able to become faster.

---

# 12. AGE-INCLUSIVE DESIGN

Apple's accessibility guidance emphasizes making information and interaction
available to people with different capabilities, and its inclusion guidance
emphasizes approachability.

For Oliskey, extend that principle to age and technical experience.

The UI should work for:

- young users
- older users
- first-time users
- experienced users

Do not infer that a person knows technical terms.

Do not rely on tiny controls.

Do not rely on hidden gestures.

Do not rely on hover for essential functionality.

Do not make the interface childish.

Aim for universal clarity.

---

# 13. ACCESSIBILITY

Use accessibility as a foundation.

Check:

- readable text
- scalable text
- contrast
- keyboard
- touch
- screen readers
- reduced motion
- focus
- semantic structure
- clear errors
- sufficient control size

The interface should remain useful when users change text size or interaction
method.

---

# 14. LAYOUT

Apple's public layout guidance emphasizes:

- grouping related items
- negative space
- enough space for essential information
- alignment
- progressive disclosure
- control spacing
- adaptation to context
- safe areas where relevant
- different screen sizes/orientations
- localization

Frontend translation:

Spacing is information architecture.

A larger gap can indicate a new conceptual group.

A smaller gap can indicate a relationship.

Do not use spacing randomly.

---

# 15. RESPONSIVE WEB TRANSLATION

Apple's HIG is platform-specific, so do not blindly copy iOS point values into
web CSS.

Instead translate the principles:

Apple concept:
"adapt to context"

Web implementation:
- responsive CSS
- fluid layout
- container queries
- flexible grids
- adaptive navigation
- appropriate content reflow

Apple concept:
"preserve context"

Web implementation:
- preserve page identity
- preserve selection
- preserve task state
- preserve meaningful controls
- preserve navigation orientation

---

# 16. BUTTONS

Apple's public button guidance emphasizes:

- recognizable purpose
- clear content
- appropriate role
- sufficient interaction area
- spacing between controls
- press state
- visual hierarchy

Web implementation:

Every button should have:

- clear label or familiar icon
- visible state
- sufficient hit area
- appropriate spacing
- semantic role
- keyboard behavior
- disabled/loading behavior

Do not copy Apple-specific button shapes blindly into web products.

---

# 17. BRANDING

Apple's public branding guidance warns that using brand color too broadly can
overwhelm an interface and dilute its impact.

Frontend implication:

Do not make every button, card, icon, and section use the brand color.

Use brand color intentionally.

For Oliskey, brand identity should support hierarchy rather than dominate it.

---

# 18. NAVIGATION

Apple's public guidance emphasizes familiar navigation patterns and deliberate
toolbars.

Frontend implication:

Navigation should answer:

- where am I?
- where can I go?
- what is primary?
- how do I return?

Avoid overcrowded navigation.

Use contextual/overflow actions for less frequent commands.

---

# 19. TOOLBARS AND ACTION PLACEMENT

Actions should be placed according to task context.

Frequent/page-level actions can be near the main navigation or page heading.

Contextual actions should remain close to the content they affect.

Rare actions can use menus.

On mobile, actions may need to move or become persistent/sticky when the task
requires it.

The correct location is determined by user context, not a universal "top" or
"bottom" rule.

---

# 20. PROGRESSIVE DISCLOSURE

If too much information cannot be shown comfortably:

- prioritize
- reveal secondary information when requested
- use detail views
- use menus
- use expandable sections
- use navigation

Do not solve information overload by making everything tiny.

---

# 21. DESIGN SYSTEM CONSISTENCY

Apple's public familiarity guidance emphasizes consistent visuals and
interactions.

Frontend implication:

If two components have the same meaning, they should generally:

- look related
- behave related
- use related spacing
- use related terminology

A design system is the engineering mechanism that enforces this consistency.

---

# 22. DO NOT INVENT APPLE RULES

Never say:

"Apple always uses 24px."

unless there is a verified source for that exact claim and platform.

Never say:

"Apple always puts buttons at the bottom."

Never say:

"Apple never uses cards."

Never say:

"Apple always uses this radius."

These are oversimplifications.

Instead ask:

> What principle is being expressed?

Then implement the principle appropriately for the actual product and platform.

---

# 23. WEB PRODUCT TRANSLATION

Oliskey is not an Apple operating-system interface.

Therefore:

Use Apple's principles.

Adapt the implementation to:

- web conventions
- React/Next.js conventions
- keyboard interaction
- browser behavior
- responsive layouts
- mouse/pointer
- touch
- accessibility
- desktop dashboards
- mobile web
- school-management workflows

The result should feel intentional and premium without pretending to be an
Apple app.

---

# 24. DECISION HIERARCHY

When two design decisions conflict:

1. User goal
2. Accessibility
3. Safety/privacy
4. Platform convention
5. Existing product consistency
6. Apple public design principle
7. Visual preference

Never allow aesthetics to override user comprehension.

---

# 25. OFFICIAL REFERENCE MAP

Design principles:
https://developer.apple.com/design/human-interface-guidelines/design-principles

Human Interface Guidelines:
https://developer.apple.com/design/human-interface-guidelines

Layout:
https://developer.apple.com/design/human-interface-guidelines/layout

Accessibility:
https://developer.apple.com/design/human-interface-guidelines/accessibility

Inclusion:
https://developer.apple.com/design/human-interface-guidelines/inclusion

Buttons:
https://developer.apple.com/design/human-interface-guidelines/buttons

Branding:
https://developer.apple.com/design/human-interface-guidelines/branding

Navigation and search:
https://developer.apple.com/design/human-interface-guidelines/navigation-and-search

Toolbars:
https://developer.apple.com/design/human-interface-guidelines/toolbars

Foundations:
https://developer.apple.com/design/human-interface-guidelines/foundations

WWDC26 Principles of Great Design:
https://developer.apple.com/videos/play/wwdc2026/250/

---

# 26. FINAL RESEARCH RULE

When the AI encounters a question like:

"How would Apple handle this?"

It must not answer from aesthetic memory.

It should:

1. identify the underlying design problem
2. consult the relevant public Apple HIG principle when available
3. distinguish documented Apple guidance from general design judgment
4. adapt the principle to the actual platform
5. prioritize the user's goal
6. preserve accessibility and usability
7. implement the smallest coherent solution

# OLISKEY PRODUCT MEMORY & MULTI-AGENT QUALITY PROTOCOL

## Extra-action principle
Do not minimize clicks blindly. Prefer an additional deliberate step when it reduces noise, prevents mistakes, separates concepts, improves accessibility, or makes the next action obvious. Optimize for fewer confusing decisions, not fewer clicks.

## Approved-design memory
Explicit user approval makes a design pattern part of the product language. Preserve approved/final/satisfactory screens and components. Do not aesthetically redesign them without permission. Only critical functionality, security, accessibility, or blocking technical problems justify an exception.

## Self-updating style
Learn only from explicit user decisions. Record reusable decisions for buttons, pages, cards, colors, spacing, typography, navigation, dialogs, responsive behavior, and accessibility in the repository design source of truth. Do not infer broad rules from isolated changes.

## Two-agent contract
For meaningful frontend work: Builder implements the SAME task/screen; Verifier independently tests the SAME task/screen. Required loop: PLAN → BUILD → VERIFY → FIX → VERIFY → PASS. The verifier can reject the implementation.

## Universal simplicity
The UI should be understandable by inexperienced users, typical adults, and older/less technically experienced users without basic interaction training. Achieve this with clear language, familiar controls, hierarchy, spacing, progressive disclosure, predictable placement, and visible feedback—not childish styling.
