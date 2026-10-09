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

type PostActions = "create" | "read" | "update" | "delete";
type PostSubject = "Post" | Post;

type AppAbility = MongoAbility<[PostActions, PostSubject]>;

function defineAbilityFor(user: User) {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.role === "ADMIN") {
    can("create", "Post");
    can("update", "Post");
    can("read", "Post");
    can("delete", "Post");
  } else {
    can("read", "Post");
    can("update", "Post", { authorId: { $eq: user.id } });
    can("create", "Post");
    can("delete", "Post", { authorId: { $eq: user.id } });
  }

  return build({
    detectSubjectType(subject) {
      return subject.__typename;
    },
  });
}

const user = userSchema.parse({
  id: "user-1",
  role: "MEMBER",
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

const ability = defineAbilityFor(user);

// ========================================================================== //

console.log(`CASL + Zod — permissões de ${user.role}\n`);

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
