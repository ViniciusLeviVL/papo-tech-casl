import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

interface User {
  id: string;
  role: "ADMIN" | "MEMBER";
};

type PostActions = "create" | "read" | "update" | "delete"
type PostSubject = "Post"
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
    can("create", "Post");
  }

  return build();
}

const user: User = {
  id: "user-1",
  role: "ADMIN",
}

const ability = defineAbilityFor(user);

// ========================================================================== //

console.log(`CASL — permissões de ${user.role}\n`);

console.table([
  {
    action: "create",
    result: ability.can("create", "Post"),
  },
  {
    action: "update",
    result: ability.can("update", "Post"),
  },
  {
    action: "read",
    result: ability.can("read", "Post"),
  },
  {
    action: "delete",
    result: ability.can("delete", "Post"),
  },
]);
