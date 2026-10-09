import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";
import * as z from "zod";

const userSchema = z.object({
  id: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "WRITER"]),
});

type User = z.infer<typeof userSchema>;

const postSchema = z.object({
  __typename: z.literal("Post").default("Post"),
  id: z.string(),
  title: z.string(),
  authorId: z.string(),
  status: z.enum(["DRAFT", "AWAITING_APPROVAL", "PUBLISHED"]),
});

type Post = z.infer<typeof postSchema>;

type PostActions = "create" | "read" | "update" | "delete"
type PostSubject = "Post" | Post

const commentSchema = z.object({
  __typename: z.literal("Comment").default("Comment"),
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
});

type Comment = z.infer<typeof commentSchema>;

type CommentActions = "create" | "read" | "update" | "delete"
type CommentSubject = "Comment" | Comment

type AppAbility = MongoAbility<
  [PostActions, PostSubject] | 
  [CommentActions, CommentSubject] | 
  ["manage", "all"]
>

function defineAbilityFor(user: User) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  switch (user.role) {
    case "ADMIN": {
      can("manage", "all")
      break
    }
    case "MEMBER": {
      can("read", "Post")
      can("read", "Comment")
      can("update", "Comment", { authorId: { $eq: user.id } })
      can("create", "Comment")
      can("delete", "Comment", { authorId: { $eq: user.id } })
      break
    }
    case "WRITER": {
      can("manage", "all")
      cannot("delete", "Post")
      can("delete", "Post", { 
        authorId: { $eq: user.id },
        status: { $in: ["DRAFT", "AWAITING_APPROVAL"] }, 
      })
      break
    }
  }

  return build({
    detectSubjectType(subject) {
      return subject.__typename
    }
  });
}

const user = userSchema.parse({
  id: "user-1",
  role: "WRITER",
});
const ownDraftPostSubject = postSchema.parse({
  id: "post-1",
  title: "Introdução ao CASL",
  authorId: user.id,
  status: "DRAFT"
});
const awaitingApprovalFromAnotherUserPostSubject = postSchema.parse({
  id: "post-2",
  title: "Introdução ao React",
  authorId: "user-2",
  status: "AWAITING_APPROVAL"
});
const ownPublishedPostSubject = postSchema.parse({
  id: "post-3",
  title: "Introdução ao NestJS",
  authorId: user.id,
  status: "PUBLISHED"
});

const ability = defineAbilityFor(user);

// ========================================================================== //

console.log(`CASL — permissões de ${user.role}\n`);

console.table([
  {
    action: "create -> ownDraftPost",
    result: ability.can("create", ownDraftPostSubject),
  },
  {
    action: "update -> ownDraftPost",
    result: ability.can("update", ownDraftPostSubject),
  },
  {
    action: "read -> ownDraftPost",
    result: ability.can("read", ownDraftPostSubject),
  },
  {
    action: "delete -> ownDraftPost",
    result: ability.can("delete", ownDraftPostSubject),
  },
]);

console.table([
  {
    action: "create -> awaitingApprovalFromAnotherUserPost",
    result: ability.can("create", awaitingApprovalFromAnotherUserPostSubject),
  },
  {
    action: "update -> awaitingApprovalFromAnotherUserPost",
    result: ability.can("update", awaitingApprovalFromAnotherUserPostSubject),
  },
  {
    action: "read -> awaitingApprovalFromAnotherUserPost",
    result: ability.can("read", awaitingApprovalFromAnotherUserPostSubject),
  },
  {
    action: "delete -> awaitingApprovalFromAnotherUserPost",
    result: ability.can("delete", awaitingApprovalFromAnotherUserPostSubject),
  },
]);


console.table([
  {
    action: "create -> ownPublishedPost",
    result: ability.can("create", ownPublishedPostSubject),
  },
  {
    action: "update -> ownPublishedPost",
    result: ability.can("update", ownPublishedPostSubject),
  },
  {
    action: "read -> ownPublishedPost",
    result: ability.can("read", ownPublishedPostSubject),
  },
  {
    action: "delete -> ownPublishedPost",
    result: ability.can("delete", ownPublishedPostSubject),
  },
]);
