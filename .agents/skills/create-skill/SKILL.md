---
name: create-skill
description: Guide users through creating a new agent skill `SKILL.md` file, including scope, structure, and validation best practices.
---

# Create Skill

This skill helps users create a new agent skill by defining the right scope, choosing the appropriate invocation and content structure, and validating the final `SKILL.md` file.

## When to Use This Skill

Use this skill when the user wants to:
- create a new agent skill for workspace-specific automation or workflows
- author a `SKILL.md` file that captures a repeatable process
- understand the structure and quality requirements for skills
- choose between workspace-scoped and user-scoped agent customizations

## What This Skill Produces

This skill produces a complete `SKILL.md` implementation with:
- YAML frontmatter containing `name` and `description`
- a clear overview of when and why to use the skill
- a step-by-step workflow for the target task
- quality checks and validation guidance
- sample invocation prompts or examples

## Step 1: Confirm Scope

Ask the user whether this skill should be shared with the project or kept personal.

- workspace-scoped: place under `.agents/skills/<name>/SKILL.md`
- user-scoped: place under `{{VSCODE_USER_PROMPTS_FOLDER}}/skills/<name>/SKILL.md`

If the user does not specify, default to workspace scope when they are working in a project repository.

## Step 2: Identify the Workflow

Extract the main workflow from the conversation:

1. the step-by-step process being followed
2. decision points and branching logic
3. quality criteria or completion checks

If no clear workflow emerges, ask clarifying questions:
- What outcome should this skill produce?
- Should it be workspace-scoped or personal?
- Do you want a quick checklist or a full multi-step workflow?

## Step 3: Build the `SKILL.md`

Include these sections:

- **Header**: `name` and `description` in YAML frontmatter
- **Introduction**: what the skill does and why it exists
- **When to Use**: explicit trigger conditions and keywords
- **Workflow**: a clear sequence of steps
- **Quality Criteria**: how to know the skill is complete and correct
- **Examples**: sample prompts or commands the user can try

## Step 4: Validate the New Skill

Check the final file for:
- valid YAML frontmatter markers `---`
- `name` matching skill folder name when possible
- a concise, specific `description`
- clear user-facing guidance in the body
- no tabs in YAML and no unescaped colon characters in values

## Example Prompts

- "Create a skill that helps me write `SKILL.md` files for new agent workflows."
- "Help me draft a workspace-scoped skill for authoring agent customization files."
- "I need a checklist for building a `SKILL.md` file with proper frontmatter and validation."

## Notes

This skill is intentionally meta: it helps users create other skills. Keep the guidance high-level and adaptable, with strong prompts for clarity and validation.
