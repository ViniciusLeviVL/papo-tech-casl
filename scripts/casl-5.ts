import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";
import * as z from "zod";

const userSchema = z.object({
  id: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

type User = z.infer<typeof userSchema>;

const postSchema = z.object({
  __typename: z.literal("Post").default("Post"),
  id: z.string(),
  title: z.string(),
  authorId: z.string(),
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
  const { can, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  if (user.role === "ADMIN") {
    can("read", "Post")
    can("update", "Post")
    can("create", "Post")
    can("delete", "Post")
    can("read", "Comment")
    can("update", "Comment")
    can("create", "Comment")
    can("delete", "Comment")
    // can("manage", "all")
  } else {
    can("read", "Post")
    can("update", "Post", { authorId: { $eq: user.id } })
    can("create", "Post")
    can("delete", "Post", { authorId: { $eq: user.id } })
    can("read", "Comment")
    can("update", "Comment", { authorId: { $eq: user.id } })
    can("create", "Comment")
    can("delete", "Comment", { authorId: { $eq: user.id } })
  }

  return build({
    detectSubjectType(subject) {
      return subject.__typename
    }
  });
}

const user = userSchema.parse({
  id: "user-1",
  role: "ADMIN",
});
const ownPostSubject = postSchema.parse({
  id: "post-1",
  title: "Introdução ao CASL",
  authorId: user.id,
});
const postFromAnotherAuthorSubject = postSchema.parse({
  id: "post-2",
  title: "Introdução ao React",
  authorId: "user-2",
});
const ownCommentSubject = commentSchema.parse({
  id: "comment-1",
  content: "Show de bola!",
  authorId: user.id,
});
const commentFromAnotherAuthorSubject = commentSchema.parse({
  id: "comment-2",
  content: "Muito top, parabéns!",
  authorId: "user-2",
});

const ability = defineAbilityFor(user);

// ========================================================================== //

console.log(`CASL — permissões de ${user.role}\n`);

console.table([
  {
    action: "create -> ownPost",
    result: ability.can("create", ownPostSubject),
  },
  {
    action: "update -> ownPost",
    result: ability.can("update", ownPostSubject),
  },
  {
    action: "read -> ownPost",
    result: ability.can("read", ownPostSubject),
  },
  {
    action: "delete -> ownPost",
    result: ability.can("delete", ownPostSubject),
  },
]);

console.table([
  {
    action: "create -> postFromAnotherAuthor",
    result: ability.can("create", postFromAnotherAuthorSubject),
  },
  {
    action: "update -> postFromAnotherAuthor",
    result: ability.can("update", postFromAnotherAuthorSubject),
  },
  {
    action: "read -> postFromAnotherAuthor",
    result: ability.can("read", postFromAnotherAuthorSubject),
  },
  {
    action: "delete -> postFromAnotherAuthor",
    result: ability.can("delete", postFromAnotherAuthorSubject),
  },
]);


console.table([
  {
    action: "create -> ownComment",
    result: ability.can("create", ownCommentSubject),
  },
  {
    action: "update -> ownComment",
    result: ability.can("update", ownCommentSubject),
  },
  {
    action: "read -> ownComment",
    result: ability.can("read", ownCommentSubject),
  },
  {
    action: "delete -> ownComment",
    result: ability.can("delete", ownCommentSubject),
  },
]);

console.table([
  {
    action: "create -> commentFromAnotherAuthor",
    result: ability.can("create", commentFromAnotherAuthorSubject),
  },
  {
    action: "update -> commentFromAnotherAuthor",
    result: ability.can("update", commentFromAnotherAuthorSubject),
  },
  {
    action: "read -> commentFromAnotherAuthor",
    result: ability.can("read", commentFromAnotherAuthorSubject),
  },
  {
    action: "delete -> commentFromAnotherAuthor",
    result: ability.can("delete", commentFromAnotherAuthorSubject),
  },
]);
