To use the icons, the codicons.css file must be included in the page:

```html
<link rel="stylesheet" href="path/to/codicon.css" id="vscode-codicon-stylesheet">
```


## Basic Usage

**HTML:**

```html
<vscode-tree id="tree-basic-example"></vscode-tree>
```

**JS:**

```javascript
const tree = document.querySelector('#tree-basic-example');
const icons = {
  branch: 'folder',
  leaf: 'file',
  open: 'folder-opened',
};
const data = [
  {
    icons,
    label: 'node_modules',
    value: 'black hole',
    subItems: [
      {
        icons,
        label: '.bin',
        subItems: [
          { icons, label: '_mocha_' },
          { icons, label: '_mocha.cmd_' },
          { icons, label: '_mocha.ps1_' },
          { icons, label: 'acorn' },
          { icons, label: 'acorn.cmd' },
          { icons, label: 'acorn.ps1' },
        ],
      },
      {
        icons,
        label: '@11ty',
        open: true,
        subItems: [
          { icons, label: 'lorem.js' },
          { icons, label: 'ipsum.js' },
          { icons, label: 'dolor.js' },
        ],
      },
      { icons, label: '.DS_Store' },
    ],
  },
  {
    icons,
    label: 'scripts',
    subItems: [
      { icons, label: 'build.js' },
      { icons, label: 'start.js' },
    ],
  },
  { icons, label: '.editorconfig', selected: true },
  { icons, label: '2021-01-18T22_10_20_535Z-debug.log' },
];

tree.data = data;

tree.addEventListener('vsc-tree-select', (event) => {
  console.log(event.detail);
});
```

## Custom Icons

**HTML:**

```html
<vscode-tree id="custom-icons-example" indent-guides arrows></vscode-tree>
```


**JS:**

```javascript
const tree = document.getElementById("custom-icons-example");

const iconUrls = {
  branch: `/dev-assets/icons/folder.svg`,
  open: `/dev-assets/icons/folder.expanded.svg`,
  leaf: `/dev-assets/icons/typescript.svg`,
};

const data = [
  {
    label: "vscode-tree",
    iconUrls,
    subItems: [
      {
        iconUrls,
        label: "index.ts",
      },
      {
        iconUrls,
        label: "vscode-tree.styles.ts",
      },
      {
        iconUrls: {
          ...iconUrls,
          leaf: `/dev-assets/icons/typescript-test.svg`,
        },
        label: "vscode-tree.test.ts",
      },
      {
        iconUrls,
        label: "vscode-tree.ts",
      },
    ],
  },
];

tree.data = data;
```


## Flat list

The Tree component can also be used to display lists

**HTML:**

```html
<vscode-tree id="list-example"></vscode-tree>
```


**JS:**

```javascript
const tree = document.getElementById("list-example");

const data = [
  {
    icons: {
      leaf: "git-commit",
    },
    label: "bump distro",
    value: "986e1248f6d8c1aa2a7f57a3fadbb00f94248c2b",
  },
  {
    icons: {
      leaf: "git-commit",
    },
    label: "Update milestone",
    value: "4ae26a156300729ed3f9d23377e5d2aff9dcd982",
  },
  {
    icons: {
      leaf: "git-commit",
    },
    label: "env - tweak shell resolve experience on startup",
    value: "52098eaeb028e123b3f8af1d4a3d64df6db528be",
  },
  {
    icons: {
      leaf: "git-commit",
    },
    label: "Merge pull request #107126 from Timmmm/atomic_tabs",
    value: "fb80c0e44af034df58e329e0f946a9a722ab297c",
  },
  {
    icons: {
      leaf: "git-commit",
    },
    label: "Simplify changes from #108193",
    value: "88856f1a1c8f90bcc12171d1af920d74bb59b625",
  },
];

tree.data = data;

tree.addEventListener("vsc-tree-select", (event) => {
  console.log(event.detail);
});
```



## Actions

Actions are clickable icons in the tree item. When an action icon is clicked, the vsc-run-action event will be dispatched. The event data contains the action name, the value of the tree item, and the tree item itself.

**HTML:**

```html
<vscode-tree id="actions-example"></vscode-tree>
```


**JS:**

```javascript
const tree = document.getElementById("actions-example");

const icons = true;

const actions = [
  {
    icon: "edit",
    actionId: "rename",
    tooltip: "Rename",
  },
  {
    icon: "trash",
    actionId: "delete",
    tooltip: "Delete",
  },
];

const data = [
  {
    label: "vscode-tree",
    icons,
    actions,
    value: "C:\\workspace\\vscode-webview-elements\\src\\vscode-tree",
    subItems: [
      {
        icons,
        actions,
        label: "index.ts",
        value:
          "C:\\workspace\\vscode-webview-elements\\src\\vscode-tree\\index.ts",
      },
      {
        icons,
        actions,
        label: "vscode-tree.styles.ts",
        value:
          "C:\\workspace\\vscode-webview-elements\\src\\vscode-tree\\vscode-tree.styles.ts",
      },
      {
        icons,
        actions,
        label: "vscode-tree.test.ts",
        value:
          "C:\\workspace\\vscode-webview-elements\\src\\vscode-tree\\vscode-tree.test.ts",
      },
      {
        icons,
        actions,
        label: "vscode-tree.ts",
        value:
          "C:\\workspace\\vscode-webview-elements\\src\\vscode-tree\\vscode-tree.ts",
      },
    ],
  },
];

tree.data = data;

tree.addEventListener("vsc-tree-action", (ev) => {
  console.log(ev.detail);
});
```


## Decorations

Decoration is additional content on the right edge of the tree item. It can be a short text, a counter, or a small, filled circle.

**HTML:**

```html
<vscode-tree id="decorations-example"></vscode-tree>
```


**JS:**

```javascript
const tree = document.getElementById('decorations-example');

const icons = true;

const data = [
  {
    label: 'vscode-tree',
    icons,
    decorations: [{
      appearance: 'counter-badge',
      content: '9',
    }],
    subItems: [
      {
        icons,
        label: 'index.ts',
        decorations: [
          {
            content: 'M',
          }
        ]
      },
      {
        icons,
        label: 'vscode-tree.styles.ts',
        decorations: [
          {
            appearance: 'filled-circle',
          }
        ]
      },
      {
        icons,
        label: 'vscode-tree.test.ts',
        decorations: [
          {
            content: '-22',
            color: '#f00',
          },
          {
            content: '+11',
            color: '#0f0',
          }
        ]
      },
      {
        icons,
        label: 'vscode-tree.ts',
      },
    ],
  },
];

tree.data = data;
```
