import {
  AbilityBuilder,
  createMongoAbility,
  subject,
  type MongoAbility,
} from "@casl/ability";

interface User {
  id: string;
  role: "ADMIN" | "MEMBER";
};

interface Post {
  id: string;
  title: string;
  authorId: string;
};

type PostActions = "create" | "read" | "update" | "delete"
type PostSubject = "Post" | Post 

type AppAbility = MongoAbility<[PostActions, PostSubject]>

function defineAbilityFor(user: User) {
  const { can, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  if (user.role === "ADMIN") {
    can("create", "Post");
    can("update", "Post");
    can("read", "Post");
    can("delete", "Post");
  } else {
    can("read", "Post");
    can("update", "Post", { authorId: { $eq: user.id } });
    can("create", "Post");
  }

  return build();
}

const user: User = {
  id: "user-1",
  role: "MEMBER",
}
const ownPost: Post = {
  id: "post-1",
  title: "Introdução ao CASL",
  authorId: user.id,
}
const postFromAnotherAuthor: Post = {
  id: "post-2",
  title: "Introdução ao React",
  authorId: "user-2",
}
const ownPostSubject = subject("Post", ownPost)
const postFromAnotherAuthorSubject = subject("Post", postFromAnotherAuthor)

const ability = defineAbilityFor(user);

console.log(ability.can("update", "Post"))

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
