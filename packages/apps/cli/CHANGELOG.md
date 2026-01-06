# 1.0.0 (2026-01-06)

### Bug Fixes

- add explicit return types to satisfy ESLint rule ([a49e3c5](https://github.com/calumpwebb/shippr/commit/a49e3c5af379b6ca208f2ea207f7a6f60b2e8145))
- **cli:** correct ASCII logo spacing ([0100b8d](https://github.com/calumpwebb/shippr/commit/0100b8dd84c25406558fb65828dbbaac9a3dc987))
- **cli:** extract ASCII logo to constant with prettier-ignore ([7b45383](https://github.com/calumpwebb/shippr/commit/7b45383951f14fb8439b6e47972cba76b6d3cb85))
- **cli:** move @shippr/shared to devDependencies ([d58307e](https://github.com/calumpwebb/shippr/commit/d58307e7cbae6211c2d1c1a92f1019e317605161))
- **cli:** use cross-platform sed syntax in build script ([3770fbc](https://github.com/calumpwebb/shippr/commit/3770fbcfbedd19588a492afb93e813cacdbe3510))
- **cli:** use toApiError for consistent error handling ([7398dd2](https://github.com/calumpwebb/shippr/commit/7398dd2aba5c13df9dbf9843a5358b11a2600c6f))

### Features

- add centralized env validation and CLI logging ([0507f22](https://github.com/calumpwebb/shippr/commit/0507f22000a1634e7388173cc2ec75a1e91e4084))
- add MOTD system with Header component and UI refinements ([dadb3de](https://github.com/calumpwebb/shippr/commit/dadb3de578d7512c9e567d574f58031c7ce23ba3))
- add refresh endpoint and improve CLI UX ([0bf9f85](https://github.com/calumpwebb/shippr/commit/0bf9f85dc41dff065a042615dc39dc568b8f5d11))
- **api:** add artificial delay in tRPC logger for dev simulation ([229676b](https://github.com/calumpwebb/shippr/commit/229676bf22702b85eee839ec77c64bcac111a7bb))
- **api:** add auth context and protected procedure support ([89895b6](https://github.com/calumpwebb/shippr/commit/89895b629d07a636340ad8ac8a8b1605bcff797f))
- **api:** add JWT signing and verification utilities ([01eb981](https://github.com/calumpwebb/shippr/commit/01eb9811c96bf644ea562517cd0159417300b249))
- **api:** add loginUser mutation with timing-attack protection ([db67e8b](https://github.com/calumpwebb/shippr/commit/db67e8b5c27f37837656c8b609aea1276f48ff7e))
- **api:** update createUser to return JWT token and handle duplicates ([4f09f14](https://github.com/calumpwebb/shippr/commit/4f09f147619800e3294901b6ecf78482dae99479))
- **cli:** add auth dependencies (jose, ink-select-input, ink-text-input) ([b35a93d](https://github.com/calumpwebb/shippr/commit/b35a93d911ff1e834e6b767da8de33d128084724))
- **cli:** add centralized color system and UI components ([d6b7fea](https://github.com/calumpwebb/shippr/commit/d6b7feabc2d9dddc9d69b3d6b1b6f618e7c0e0ec))
- **cli:** add ESC key navigation to go back from login/signup forms ([2154637](https://github.com/calumpwebb/shippr/commit/2154637233f8e873888c6385bcee042975c259d1))
- **cli:** add interactive dashboard menu with sign out ([8c4770f](https://github.com/calumpwebb/shippr/commit/8c4770fced90cfa734e297481307123cda225204))
- **cli:** add token storage and validation utilities ([174111e](https://github.com/calumpwebb/shippr/commit/174111ea4827780f55b78f5153bede84f1d715d5))
- **cli:** add tRPC client with auth header support ([0377d21](https://github.com/calumpwebb/shippr/commit/0377d2189ffd334db32e8567310bb2aeae5a3275))
- **cli:** add TypeScript types for routing and auth ([00c56f2](https://github.com/calumpwebb/shippr/commit/00c56f2e3118a7ddf8d87fc9161cdb2b5a81d338))
- **cli:** implement authentication UI with Router and all components ([1bbd112](https://github.com/calumpwebb/shippr/commit/1bbd1128748366bb4ab226346fb489a2c56ccb5b))
- **cli:** move forgot password to welcome menu ([64b226e](https://github.com/calumpwebb/shippr/commit/64b226e476c5e4e99af8e61c3324231c4787c082))
- implement forgot password flow ([0f1d5a3](https://github.com/calumpwebb/shippr/commit/0f1d5a34e0576a0fc753ef6a87d3e273733fcc61))
- improve CLI form UX and add tRPC logging middleware ([033a527](https://github.com/calumpwebb/shippr/commit/033a527a566bd43b52bbfd8ff82d490d27ab19b2))
