# CASL com TypeScript e Zod

Este repositório é uma introdução prática ao
[CASL](https://casl.js.org/), uma biblioteca de autorização para aplicações
JavaScript e TypeScript.

O objetivo dos exemplos é mostrar como declarar e verificar permissões sem
depender de um framework ou da estrutura de um projeto específico. Os mesmos
conceitos podem ser usados em APIs, aplicações front-end, serviços, workers ou
qualquer outro ambiente JavaScript.

## O que o CASL resolve

O CASL representa as permissões de um usuário por meio de uma **Ability**. Ela
responde perguntas como:

- este usuário pode ler um post?
- um membro pode alterar somente os próprios comentários?
- um escritor pode excluir um post publicado?
- um administrador pode gerenciar todos os recursos?

Uma regra de autorização pode conter quatro partes:

- **ação:** o que será feito, como `create`, `read`, `update` ou `delete`;
- **subject:** o recurso afetado, como `Post` ou `Comment`;
- **condições:** restrições baseadas nos dados do recurso, como autor ou status;
- **campos:** propriedades específicas que podem ser lidas ou alteradas.

O CASL cuida de **autorização**, não de autenticação. A autenticação identifica
o usuário; a autorização determina o que esse usuário pode fazer.

## Instalação

```bash
yarn install
```

Para executar o exemplo completo uma vez:

```bash
yarn tsx scripts/casl.ts
```

Para executá-lo em modo de observação:

```bash
yarn casl:watch
```

O modo `watch` executa o script novamente quando um arquivo utilizado por ele é
alterado. Use `Ctrl+C` para encerrá-lo.

Também é possível executar qualquer etapa individualmente:

```bash
yarn tsx scripts/casl-4.ts
```

## Criando uma Ability

As regras são declaradas com `AbilityBuilder`. `can` concede uma permissão,
`cannot` cria uma proibição explícita e `build` produz a Ability que será usada
pela aplicação.

```ts
import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

type Action = "create" | "read" | "update" | "delete";
type AppAbility = MongoAbility<[Action, "Post" | Post]>;

function defineAbilityFor(user: User) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  can("read", "Post");
  can("update", "Post", { authorId: { $eq: user.id } });
  cannot("delete", "Post", { status: { $eq: "PUBLISHED" } });

  return build({
    detectSubjectType(subject) {
      return subject.__typename;
    },
  });
}
```

Depois de criada, a Ability pode verificar permissões com `can` ou `cannot`:

```ts
ability.can("read", "Post");
ability.can("update", post);
ability.cannot("delete", post);
```

## Validando os subjects com Zod

Os exemplos a partir de `casl-4.ts` usam Zod para definir e validar os usuários
e subjects. Assim, o mesmo schema fornece validação em runtime e o tipo usado
pelo TypeScript:

```ts
import * as z from "zod";

const postSchema = z.object({
  __typename: z.literal("Post").default("Post"),
  id: z.string(),
  title: z.string(),
  authorId: z.string(),
});

type Post = z.infer<typeof postSchema>;

const post = postSchema.parse({
  id: "post-1",
  title: "Introdução ao CASL",
  authorId: "user-1",
});
```

O método `.parse()` valida os dados e devolve um objeto tipado. Como
`__typename` possui um valor padrão, ele não precisa ser informado na entrada e
é adicionado ao resultado pelo Zod.

## Subjects e detecção de tipo

Ao verificar uma instância representada por um objeto simples, o CASL precisa
descobrir qual subject aquele objeto representa. Neste projeto, essa informação
fica em `__typename`:

```ts
return build({
  detectSubjectType(subject) {
    return subject.__typename;
  },
});
```

Essa é apenas uma convenção. Uma aplicação também pode identificar subjects por
classes, por outra propriedade ou pelo helper `subject` fornecido pelo CASL.

## Permissões condicionais

Como os exemplos usam `createMongoAbility`, as condições seguem uma sintaxe
semelhante às consultas do MongoDB:

```ts
can("update", "Post", {
  authorId: { $eq: user.id },
});

can("delete", "Post", {
  authorId: { $eq: user.id },
  status: { $in: ["DRAFT", "AWAITING_APPROVAL"] },
});
```

No primeiro caso, o usuário pode atualizar somente posts cujo `authorId` seja
igual ao seu identificador. No segundo, também é necessário que o post esteja
em um dos status permitidos.

## String de subject ou objeto

Existe uma diferença importante entre verificar uma string de subject e uma
instância:

```ts
const ownPost = postSchema.parse({
  id: "post-1",
  title: "Meu post",
  authorId: user.id,
});

const anotherPost = postSchema.parse({
  id: "post-2",
  title: "Post de outra pessoa",
  authorId: "another-user",
});

ability.can("update", ownPost); // true
ability.can("update", anotherPost); // false
ability.can("update", "Post"); // true
```

As perguntas feitas nessas verificações são diferentes:

- com um objeto, perguntamos se o usuário pode atualizar **aquele post**;
- com a string `"Post"`, perguntamos se existe uma regra que permita ao usuário
  atualizar **algum post**.

O CASL só consegue avaliar condições como `authorId` e `status` quando recebe o
objeto completo.

## `manage`, `all` e regras negativas

`manage` representa qualquer ação e `all` representa qualquer subject:

```ts
can("manage", "all");
```

Uma permissão ampla pode ser combinada com exceções:

```ts
can("manage", "all");
cannot("delete", "Post");
can("delete", "Post", {
  authorId: { $eq: user.id },
  status: { $in: ["DRAFT", "AWAITING_APPROVAL"] },
});
```

A ordem é importante quando regras se sobrepõem: regras declaradas depois têm
prioridade. Nesse exemplo, o escritor pode gerenciar tudo, não pode excluir
posts em geral, mas recupera a permissão para excluir os próprios posts que
ainda não foram publicados.

## Tipagem das permissões

`MongoAbility` pode descrever quais combinações de ações e subjects são válidas:

```ts
type AppAbility = MongoAbility<
  | [PostActions, PostSubject]
  | [CommentActions, CommentSubject]
  | ["manage", "all"]
>;
```

Isso permite que o TypeScript detecte ações ou subjects inválidos durante o
desenvolvimento.

## Evolução dos exemplos

Os scripts foram organizados para introduzir os conceitos progressivamente:

1. [`casl-1.ts`](scripts/casl-1.ts) apresenta permissões básicas baseadas em
   papéis para um único subject.
2. [`casl-2.ts`](scripts/casl-2.ts) adiciona condições e usa o helper `subject`
   para identificar objetos.
3. [`casl-3.ts`](scripts/casl-3.ts) substitui o helper pela detecção baseada em
   `__typename`.
4. [`casl-4.ts`](scripts/casl-4.ts) introduz schemas Zod, tipos derivados com
   `z.infer`, valores padrão e validação com `.parse()`.
5. [`casl-5.ts`](scripts/casl-5.ts) adiciona múltiplos subjects mantendo os
   modelos definidos com Zod.
6. [`casl-6.ts`](scripts/casl-6.ts) adiciona novos papéis e regras negativas com
   `cannot`.
7. [`casl-7.ts`](scripts/casl-7.ts) adiciona status ao schema de Post e combina
   permissões amplas, proibições e exceções condicionais.
8. [`casl.ts`](scripts/casl.ts) reúne o exemplo completo executado pelo comando
   `yarn casl:watch`.

## Como aplicar em uma aplicação

Uma aplicação normalmente centraliza suas regras em uma função como
`defineAbilityFor(user)`. Após autenticar o usuário, ela cria a Ability e a
reutiliza em controllers, serviços, componentes, guards ou outras camadas.

Centralizar as regras facilita a leitura, os testes e a aplicação consistente
das mesmas políticas de autorização em diferentes partes do sistema.

## Referências

- [Documentação do CASL](https://casl.js.org/)
- [Pacote `@casl/ability`](https://www.npmjs.com/package/@casl/ability)
- [Repositório do CASL](https://github.com/stalniy/casl)
- [Documentação do Zod](https://zod.dev/)

### Curso e aplicação de referência

Os exemplos deste repositório seguem os mesmos padrões apresentados no curso
da Rocketseat, no qual o CASL é aplicado em um projeto real com uma estrutura de
autorização baseada em papéis e permissões:

- [Curso Rocketseat — SaaS com Next.js e RBAC](https://app.rocketseat.com.br/jornada/saa-s-next-js-rbac/visao-geral)
- [Repositório do curso — SaaS Next.js RBAC](https://github.com/rocketseat-education/course-saas-next-rbac)
