/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ContentWarning =
  | 'MIXED'
  | 'NSFW'
  | 'SAFE';

export type UpdateExtensionPatchInput = {
  install?: boolean | null | undefined;
  uninstall?: boolean | null | undefined;
  update?: boolean | null | undefined;
};

export type ExtensionFieldsFragment = { pkgName: string, name: string, lang: string, iconUrl: string, versionName: string, isInstalled: boolean, hasUpdate: boolean, isObsolete: boolean, contentWarning: ContentWarning, storeIndexUrl: string | null };

export type ExtensionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ExtensionsQuery = { extensions: { totalCount: number, nodes: Array<{ pkgName: string, name: string, lang: string, iconUrl: string, versionName: string, isInstalled: boolean, hasUpdate: boolean, isObsolete: boolean, contentWarning: ContentWarning, storeIndexUrl: string | null }> } };

export type FetchExtensionsMutationVariables = Exact<{ [key: string]: never; }>;


export type FetchExtensionsMutation = { fetchExtensions: { extensions: Array<{ pkgName: string, name: string, lang: string, iconUrl: string, versionName: string, isInstalled: boolean, hasUpdate: boolean, isObsolete: boolean, contentWarning: ContentWarning, storeIndexUrl: string | null }> } | null };

export type UpdateExtensionMutationVariables = Exact<{
  id: string;
  patch: UpdateExtensionPatchInput;
}>;


export type UpdateExtensionMutation = { updateExtension: { extension: { pkgName: string, name: string, lang: string, iconUrl: string, versionName: string, isInstalled: boolean, hasUpdate: boolean, isObsolete: boolean, contentWarning: ContentWarning, storeIndexUrl: string | null } | null } | null };

export type AboutServerQueryVariables = Exact<{ [key: string]: never; }>;


export type AboutServerQuery = { aboutServer: { name: string, version: string } };

export type SourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type SourcesQuery = { sources: { nodes: Array<{ id: string, name: string, lang: string, iconUrl: string, supportsLatest: boolean }> } };

export type ExtensionStoresQueryVariables = Exact<{ [key: string]: never; }>;


export type ExtensionStoresQuery = { extensionStores: { nodes: Array<{ name: string, badgeLabel: string, indexUrl: string, isLegacy: boolean }> } };

export type AddExtensionStoreMutationVariables = Exact<{
  indexUrl: string;
}>;


export type AddExtensionStoreMutation = { addExtensionStore: { extensionStore: { name: string, indexUrl: string } } | null };

export type RemoveExtensionStoreMutationVariables = Exact<{
  indexUrl: string;
}>;


export type RemoveExtensionStoreMutation = { removeExtensionStore: { extensionStore: { indexUrl: string } | null } | null };

export const ExtensionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ExtensionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ExtensionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pkgName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"versionName"}},{"kind":"Field","name":{"kind":"Name","value":"isInstalled"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"isObsolete"}},{"kind":"Field","name":{"kind":"Name","value":"contentWarning"}},{"kind":"Field","name":{"kind":"Name","value":"storeIndexUrl"}}]}}]} as unknown as DocumentNode<ExtensionFieldsFragment, unknown>;
export const ExtensionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Extensions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extensions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"by"},"value":{"kind":"EnumValue","value":"NAME"}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ExtensionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ExtensionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ExtensionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pkgName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"versionName"}},{"kind":"Field","name":{"kind":"Name","value":"isInstalled"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"isObsolete"}},{"kind":"Field","name":{"kind":"Name","value":"contentWarning"}},{"kind":"Field","name":{"kind":"Name","value":"storeIndexUrl"}}]}}]} as unknown as DocumentNode<ExtensionsQuery, ExtensionsQueryVariables>;
export const FetchExtensionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FetchExtensions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchExtensions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extensions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ExtensionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ExtensionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ExtensionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pkgName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"versionName"}},{"kind":"Field","name":{"kind":"Name","value":"isInstalled"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"isObsolete"}},{"kind":"Field","name":{"kind":"Name","value":"contentWarning"}},{"kind":"Field","name":{"kind":"Name","value":"storeIndexUrl"}}]}}]} as unknown as DocumentNode<FetchExtensionsMutation, FetchExtensionsMutationVariables>;
export const UpdateExtensionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateExtension"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"patch"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateExtensionPatchInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateExtension"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"patch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"patch"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extension"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ExtensionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ExtensionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ExtensionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pkgName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"versionName"}},{"kind":"Field","name":{"kind":"Name","value":"isInstalled"}},{"kind":"Field","name":{"kind":"Name","value":"hasUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"isObsolete"}},{"kind":"Field","name":{"kind":"Name","value":"contentWarning"}},{"kind":"Field","name":{"kind":"Name","value":"storeIndexUrl"}}]}}]} as unknown as DocumentNode<UpdateExtensionMutation, UpdateExtensionMutationVariables>;
export const AboutServerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AboutServer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aboutServer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<AboutServerQuery, AboutServerQueryVariables>;
export const SourcesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"by"},"value":{"kind":"EnumValue","value":"NAME"}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"iconUrl"}},{"kind":"Field","name":{"kind":"Name","value":"supportsLatest"}}]}}]}}]}}]} as unknown as DocumentNode<SourcesQuery, SourcesQueryVariables>;
export const ExtensionStoresDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExtensionStores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extensionStores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"badgeLabel"}},{"kind":"Field","name":{"kind":"Name","value":"indexUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isLegacy"}}]}}]}}]}}]} as unknown as DocumentNode<ExtensionStoresQuery, ExtensionStoresQueryVariables>;
export const AddExtensionStoreDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddExtensionStore"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"indexUrl"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addExtensionStore"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"indexUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"indexUrl"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extensionStore"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"indexUrl"}}]}}]}}]}}]} as unknown as DocumentNode<AddExtensionStoreMutation, AddExtensionStoreMutationVariables>;
export const RemoveExtensionStoreDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveExtensionStore"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"indexUrl"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeExtensionStore"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"indexUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"indexUrl"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extensionStore"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"indexUrl"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveExtensionStoreMutation, RemoveExtensionStoreMutationVariables>;