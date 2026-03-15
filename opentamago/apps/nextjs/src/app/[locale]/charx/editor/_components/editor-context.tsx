"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  characterFormSchema,
  defaultCharacterForm,
  type CharacterFormData,
  type LorebookEntryFormData,
  type AssetFormData,
  type EditorTab,
  type CharacterField,
} from "~/lib/editor/assistant-types";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import type { LorebookEntryDocument } from "~/lib/db/schemas/lorebook";
import type { CharacterAssetDocument } from "~/lib/db/schemas/character-asset";

// Form context - for character form state
interface FormContextValue {
  form: UseFormReturn<CharacterFormData>;
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within EditorProvider");
  }
  return context;
}

// Lorebook context - for lorebook entries state
interface LorebookContextValue {
  entries: LorebookEntryFormData[];
  addEntry: (entry?: Partial<LorebookEntryFormData>) => void;
  updateEntry: (id: string, updates: Partial<LorebookEntryFormData>) => void;
  deleteEntry: (id: string) => void;
  setEntries: (entries: LorebookEntryFormData[]) => void;
}

const LorebookContext = createContext<LorebookContextValue | null>(null);

export function useLorebookContext() {
  const context = useContext(LorebookContext);
  if (!context) {
    throw new Error("useLorebookContext must be used within EditorProvider");
  }
  return context;
}

// Assets context - for assets state
interface AssetsContextValue {
  assets: AssetFormData[];
  addAsset: (asset: AssetFormData) => void;
  deleteAsset: (id: string) => void;
  setAssets: (assets: AssetFormData[]) => void;
}

const AssetsContext = createContext<AssetsContextValue | null>(null);

export function useAssetsContext() {
  const context = useContext(AssetsContext);
  if (!context) {
    throw new Error("useAssetsContext must be used within EditorProvider");
  }
  return context;
}

// Tab context - for active tab state
interface TabContextValue {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within EditorProvider");
  }
  return context;
}

// Actions context - for cross-component actions
interface ActionsContextValue {
  copyToField: (field: CharacterField, content: string) => void;
  copyToLorebook: (keys: string[], content: string) => void;
  addAssetFromAI: (data: Uint8Array, name: string, assetType: AssetFormData["assetType"]) => void;
  setAvatarFromAI: (data: Uint8Array) => void;
  save: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
}

const ActionsContext = createContext<ActionsContextValue | null>(null);

export function useActionsContext() {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActionsContext must be used within EditorProvider");
  }
  return context;
}

// Provider props
interface EditorProviderProps {
  children: ReactNode;
  initialCharacterId?: string | null;
}

export function EditorProvider({ children, initialCharacterId }: EditorProviderProps) {
  const t = useTranslations("charxEditor");
  const { saveCharacterWithAssets, getCharacter, getLorebookEntries, getAssets } = useCharacters();

  // Form state
  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: defaultCharacterForm,
  });

  // Lorebook state
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntryFormData[]>([]);

  // Assets state
  const [assets, setAssets] = useState<AssetFormData[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<EditorTab>("character");

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Loading state for initial character load
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(!!initialCharacterId);

  // Load character data if initialCharacterId is provided
  useEffect(() => {
    if (!initialCharacterId) return;

    const loadCharacter = async () => {
      try {
        const character = await getCharacter(initialCharacterId);
        if (character) {
          // Load character data into form
          form.reset({
            name: character.name,
            description: character.description,
            personality: character.personality,
            scenario: character.scenario,
            firstMessage: character.firstMessage,
            exampleDialogue: character.exampleDialogue,
            systemPrompt: character.systemPrompt,
            postHistoryInstructions: character.postHistoryInstructions,
            alternateGreetings: character.alternateGreetings,
            groupOnlyGreetings: character.groupOnlyGreetings,
            creatorNotes: character.creatorNotes,
            tags: character.tags,
            creator: character.creator,
            characterVersion: character.characterVersion,
            nickname: character.nickname,
            avatarData: character.avatarData,
          });

          // Explicitly set avatarData after reset to trigger watch subscription in memoized components
          if (character.avatarData) {
            form.setValue("avatarData", character.avatarData, { shouldDirty: false, shouldTouch: true, shouldValidate: true });
          }

          // Load lorebook entries
          const entries = await getLorebookEntries(initialCharacterId);
          if (entries.length > 0) {
            setLorebookEntries(
              entries.map((entry: LorebookEntryDocument) => ({
                id: entry.id,
                keys: entry.keys,
                content: entry.content,
                enabled: entry.enabled,
                priority: entry.priority,
                position: entry.position,
                insertionOrder: entry.insertionOrder,
                caseSensitive: entry.caseSensitive,
                selective: entry.selective,
                secondaryKeys: entry.secondaryKeys,
                constant: entry.constant,
                useRegex: entry.useRegex,
                name: entry.name,
                comment: entry.comment,
              }))
            );
          }

          // Load assets
          const characterAssets = await getAssets(initialCharacterId);
          if (characterAssets.length > 0) {
            const loadedAssets: AssetFormData[] = await Promise.all(
              characterAssets.map(async (asset: CharacterAssetDocument & { data: Uint8Array }) => {
                const blob = new Blob([asset.data.slice()], { type: `image/${asset.ext}` });
                const dataUrl = URL.createObjectURL(blob);
                return {
                  id: asset.id,
                  assetType: asset.assetType as AssetFormData["assetType"],
                  name: asset.name,
                  ext: asset.ext,
                  data: asset.data,
                  dataUrl,
                };
              })
            );
            setAssets(loadedAssets);
          }
        }
      } catch (error) {
        console.error("Failed to load character:", error);
      } finally {
        setIsLoadingCharacter(false);
      }
    };

    void loadCharacter();
  }, [initialCharacterId, getCharacter, getLorebookEntries, getAssets, form]);

  // Lorebook actions
  const addEntry = useCallback((entry?: Partial<LorebookEntryFormData>) => {
    const newEntry: LorebookEntryFormData = {
      id: nanoid(),
      keys: entry?.keys ?? [],
      content: entry?.content ?? "",
      enabled: entry?.enabled ?? true,
      priority: entry?.priority ?? 10,
      position: entry?.position ?? "before_char",
      insertionOrder: entry?.insertionOrder ?? 100,
      caseSensitive: entry?.caseSensitive ?? false,
      selective: entry?.selective ?? false,
      secondaryKeys: entry?.secondaryKeys ?? [],
      constant: entry?.constant ?? false,
      useRegex: entry?.useRegex ?? false,
      name: entry?.name,
      comment: entry?.comment,
    };
    setLorebookEntries((prev) => [...prev, newEntry]);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<LorebookEntryFormData>) => {
    setLorebookEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setLorebookEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Assets actions
  const addAsset = useCallback((asset: AssetFormData) => {
    setAssets((prev) => [...prev, asset]);
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => {
      const asset = prev.find((a) => a.id === id);
      if (asset?.dataUrl) {
        URL.revokeObjectURL(asset.dataUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Cross-component actions
  const copyToField = useCallback(
    (field: CharacterField, content: string) => {
      form.setValue(field, content, { shouldDirty: true });
      toast.success(t("toast.copiedToField"));
      setActiveTab("character");
    },
    [form, t]
  );

  const copyToLorebook = useCallback(
    (keys: string[], content: string) => {
      addEntry({
        keys,
        content,
        insertionOrder: lorebookEntries.length * 10 + 100,
      });
      toast.success(t("toast.addedToLorebook"));
      setActiveTab("lorebook");
    },
    [addEntry, lorebookEntries.length, t]
  );

  const addAssetFromAI = useCallback(
    (data: Uint8Array, name: string, assetType: AssetFormData["assetType"]) => {
      const ext = "png";
      const blob = new Blob([data.slice()], { type: "image/png" });
      const dataUrl = URL.createObjectURL(blob);

      addAsset({
        id: nanoid(),
        assetType,
        name,
        ext,
        data,
        dataUrl,
      });
      toast.success(t("toast.addedToAssets"));
      setActiveTab("assets");
    },
    [addAsset, t]
  );

  const setAvatarFromAI = useCallback(
    (data: Uint8Array) => {
      // Convert Uint8Array to base64 data URL synchronously
      let binary = "";
      const bytes = new Uint8Array(data);
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:image/png;base64,${base64}`;

      // Set the avatar data and trigger form update
      form.setValue("avatarData", dataUrl, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      toast.success(t("toast.avatarSet"));
      setActiveTab("character");
    },
    [form, t]
  );

  const save = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t("toast.validationError"));
      return;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();

      let avatarBlob: Blob | undefined;
      if (formData.avatarData) {
        try {
          const response = await fetch(formData.avatarData);
          avatarBlob = await response.blob();
        } catch (error) {
          console.error("Failed to convert avatar to blob:", error);
        }
      }

      await saveCharacterWithAssets({
        character: {
          name: formData.name,
          description: formData.description,
          personality: formData.personality,
          scenario: formData.scenario,
          firstMessage: formData.firstMessage,
          exampleDialogue: formData.exampleDialogue,
          systemPrompt: formData.systemPrompt,
          postHistoryInstructions: formData.postHistoryInstructions,
          alternateGreetings: formData.alternateGreetings,
          groupOnlyGreetings: formData.groupOnlyGreetings,
          creatorNotes: formData.creatorNotes,
          tags: formData.tags,
          creator: formData.creator,
          characterVersion: formData.characterVersion,
          nickname: formData.nickname,
          avatarData: formData.avatarData,
          extensions: {},
        },
        avatarBlob,
        lorebookEntries: lorebookEntries.map((entry) => ({
          keys: entry.keys,
          content: entry.content,
          enabled: entry.enabled,
          priority: entry.priority,
          position: entry.position,
          insertionOrder: entry.insertionOrder,
          caseSensitive: entry.caseSensitive,
          selective: entry.selective,
          secondaryKeys: entry.secondaryKeys,
          constant: entry.constant,
          useRegex: entry.useRegex,
          extensions: {},
          name: entry.name,
          comment: entry.comment,
        })),
        assets: assets.map((asset) => ({
          data: asset.data,
          metadata: {
            assetType: asset.assetType,
            name: asset.name,
            uri: `assets/${asset.assetType}/${asset.name}.${asset.ext}`,
            ext: asset.ext,
          },
        })),
      });

      toast.success(t("toast.saved"));
    } catch (error) {
      console.error("Failed to save character:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setIsSaving(false);
    }
  }, [form, lorebookEntries, assets, saveCharacterWithAssets, t]);

  const isDirty = form.formState.isDirty || lorebookEntries.length > 0 || assets.length > 0;

  // Memoized context values
  const formContextValue = useMemo(() => ({ form }), [form]);

  const lorebookContextValue = useMemo(
    () => ({
      entries: lorebookEntries,
      addEntry,
      updateEntry,
      deleteEntry,
      setEntries: setLorebookEntries,
    }),
    [lorebookEntries, addEntry, updateEntry, deleteEntry]
  );

  const assetsContextValue = useMemo(
    () => ({
      assets,
      addAsset,
      deleteAsset,
      setAssets,
    }),
    [assets, addAsset, deleteAsset]
  );

  const tabContextValue = useMemo(
    () => ({ activeTab, setActiveTab }),
    [activeTab]
  );

  const actionsContextValue = useMemo(
    () => ({
      copyToField,
      copyToLorebook,
      addAssetFromAI,
      setAvatarFromAI,
      save,
      isSaving,
      isDirty,
    }),
    [copyToField, copyToLorebook, addAssetFromAI, setAvatarFromAI, save, isSaving, isDirty]
  );

  // Show loading state while loading initial character
  if (isLoadingCharacter) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <FormContext.Provider value={formContextValue}>
      <LorebookContext.Provider value={lorebookContextValue}>
        <AssetsContext.Provider value={assetsContextValue}>
          <TabContext.Provider value={tabContextValue}>
            <ActionsContext.Provider value={actionsContextValue}>
              {children}
            </ActionsContext.Provider>
          </TabContext.Provider>
        </AssetsContext.Provider>
      </LorebookContext.Provider>
    </FormContext.Provider>
  );
}
