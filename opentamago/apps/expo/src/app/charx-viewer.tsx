import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { Text } from "~/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";

import type {
  ParsedCharX,
  CharacterCardV3,
  CharacterBook,
  LorebookEntry,
  RisuModule,
  AssetItem,
} from "~/lib/charx/types";
import {
  parseCharXFromUri,
  getCategorizedAssets,
  assetToDataUrl,
} from "~/lib/charx/parser";

type MainTab = "character" | "lorebook" | "assets" | "module";

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2 items-center rounded-lg ${
        active ? "bg-primary" : "bg-muted"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
        {count !== undefined ? ` (${count})` : ""}
      </Text>
    </Pressable>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View className="border border-border rounded-lg overflow-hidden">
      <Pressable
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between p-3 bg-muted/30"
      >
        <Text className="font-semibold text-sm flex-1">{title}</Text>
        <Text className="text-muted-foreground">{open ? "▼" : "▶"}</Text>
      </Pressable>
      {open && <View className="p-3 border-t border-border">{children}</View>}
    </View>
  );
}

function TextBlock({ label, content }: { label: string; content: string }) {
  if (!content) return null;
  return (
    <CollapsibleSection title={label}>
      <Text className="text-sm text-foreground">{content}</Text>
    </CollapsibleSection>
  );
}

// ─── Character Tab ────────────────────────────────────────────

function CharacterTab({ card }: { card: CharacterCardV3 }) {
  const d = card.data;
  const [subTab, setSubTab] = useState<"basic" | "messages" | "prompts" | "meta">("basic");

  return (
    <View className="gap-3">
      {/* Header info */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            <Text>{card.spec_version}</Text>
          </Badge>
          {d.creator ? (
            <Badge variant="outline">
              <Text>by {d.creator}</Text>
            </Badge>
          ) : null}
          {d.character_version ? (
            <Badge variant="outline">
              <Text>v{d.character_version}</Text>
            </Badge>
          ) : null}
        </View>
        {d.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {d.tags.map((tag, i) => (
              <Badge key={i} variant="outline">
                <Text>{tag}</Text>
              </Badge>
            ))}
          </View>
        )}
      </View>

      {/* Sub-tabs */}
      <View className="flex-row gap-1">
        {(["basic", "messages", "prompts", "meta"] as const).map((t) => (
          <TabButton
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            active={subTab === t}
            onPress={() => setSubTab(t)}
          />
        ))}
      </View>

      {subTab === "basic" && (
        <View className="gap-2">
          <TextBlock label="Description" content={d.description} />
          <TextBlock label="Personality" content={d.personality} />
          <TextBlock label="Scenario" content={d.scenario} />
        </View>
      )}

      {subTab === "messages" && (
        <View className="gap-2">
          <TextBlock label="First Message" content={d.first_mes} />
          <TextBlock label="Example Messages" content={d.mes_example} />
          {d.alternate_greetings.length > 0 && (
            <CollapsibleSection
              title={`Alternate Greetings (${d.alternate_greetings.length})`}
            >
              <View className="gap-2">
                {d.alternate_greetings.map((g, i) => (
                  <View key={i} className="bg-muted/30 rounded p-2">
                    <Text className="text-xs font-semibold text-muted-foreground mb-1">
                      Greeting {i + 1}
                    </Text>
                    <Text className="text-sm">{g}</Text>
                  </View>
                ))}
              </View>
            </CollapsibleSection>
          )}
          {d.group_only_greetings.length > 0 && (
            <CollapsibleSection
              title={`Group Greetings (${d.group_only_greetings.length})`}
            >
              <View className="gap-2">
                {d.group_only_greetings.map((g, i) => (
                  <View key={i} className="bg-muted/30 rounded p-2">
                    <Text className="text-sm">{g}</Text>
                  </View>
                ))}
              </View>
            </CollapsibleSection>
          )}
        </View>
      )}

      {subTab === "prompts" && (
        <View className="gap-2">
          <TextBlock label="System Prompt" content={d.system_prompt} />
          <TextBlock
            label="Post History Instructions"
            content={d.post_history_instructions}
          />
        </View>
      )}

      {subTab === "meta" && (
        <View className="gap-2">
          <Card>
            <CardContent className="p-3 gap-1">
              <Row label="Spec" value={`${card.spec} v${card.spec_version}`} />
              <Row label="Creator" value={d.creator || "Unknown"} />
              <Row label="Version" value={d.character_version || "—"} />
              <Row label="Nickname" value={d.nickname || "—"} />
              {d.creation_date && (
                <Row
                  label="Created"
                  value={new Date(d.creation_date * 1000).toLocaleDateString()}
                />
              )}
              {d.modification_date && (
                <Row
                  label="Modified"
                  value={new Date(d.modification_date * 1000).toLocaleDateString()}
                />
              )}
            </CardContent>
          </Card>
          <TextBlock label="Creator Notes" content={d.creator_notes} />
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium">{value}</Text>
    </View>
  );
}

// ─── Lorebook Tab ────────────────────────────────────────────

function LorebookTab({ lorebook }: { lorebook: CharacterBook }) {
  return (
    <View className="gap-3">
      <Card>
        <CardContent className="p-3 gap-1">
          <Row label="Entries" value={String(lorebook.entries.length)} />
          <Row label="Scan Depth" value={String(lorebook.scan_depth)} />
          <Row label="Token Budget" value={String(lorebook.token_budget)} />
          <Row
            label="Recursive"
            value={lorebook.recursive_scanning ? "Yes" : "No"}
          />
        </CardContent>
      </Card>

      {lorebook.entries.map((entry, i) => (
        <LorebookEntryItem key={entry.id || i} entry={entry} index={i} />
      ))}
    </View>
  );
}

function LorebookEntryItem({
  entry,
  index,
}: {
  entry: LorebookEntry;
  index: number;
}) {
  return (
    <CollapsibleSection
      title={`#${index + 1} ${entry.name || entry.keys.join(", ") || "Entry"}`}
    >
      <View className="gap-2">
        <View className="flex-row flex-wrap gap-1">
          {entry.keys.map((k, i) => (
            <Badge key={i} variant="secondary">
              <Text>{k}</Text>
            </Badge>
          ))}
        </View>
        <View className="flex-row gap-2">
          <Badge variant={entry.enabled ? "default" : "outline"}>
            <Text>{entry.enabled ? "Enabled" : "Disabled"}</Text>
          </Badge>
          <Badge variant="outline">
            <Text>Priority: {entry.priority}</Text>
          </Badge>
          <Badge variant="outline">
            <Text>{entry.position}</Text>
          </Badge>
        </View>
        {entry.comment ? (
          <Text className="text-xs text-muted-foreground italic">
            {entry.comment}
          </Text>
        ) : null}
        <Separator />
        <Text className="text-sm">{entry.content}</Text>
      </View>
    </CollapsibleSection>
  );
}

// ─── Assets Tab ──────────────────────────────────────────────

function AssetsTab({ parsed }: { parsed: ParsedCharX }) {
  const categorized = getCategorizedAssets(parsed);
  const categories = [
    { key: "emotions", label: "Emotions", items: categorized.emotions },
    { key: "icons", label: "Icons", items: categorized.icons },
    { key: "backgrounds", label: "BGs", items: categorized.backgrounds },
    { key: "other", label: "Other", items: categorized.other },
  ].filter((c) => c.items.length > 0);

  const [activeCategory, setActiveCategory] = useState(categories[0]?.key ?? "");
  const activeItems =
    categories.find((c) => c.key === activeCategory)?.items ?? [];

  if (categories.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-muted-foreground">No assets found</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row gap-1">
        {categories.map((c) => (
          <TabButton
            key={c.key}
            label={c.label}
            count={c.items.length}
            active={activeCategory === c.key}
            onPress={() => setActiveCategory(c.key)}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {activeItems.map((item, i) => (
          <View
            key={i}
            className="w-[31%] aspect-square rounded-lg overflow-hidden border border-border bg-muted"
          >
            <Image
              source={{ uri: item.dataUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
              <Text
                className="text-white text-[10px]"
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Module Tab ──────────────────────────────────────────────

function ModuleTab({ module }: { module: RisuModule }) {
  const [subTab, setSubTab] = useState<"triggers" | "regex" | "code">(
    "triggers"
  );

  return (
    <View className="gap-3">
      <Card>
        <CardContent className="p-3 gap-2">
          <Text className="font-semibold">{module.name || "Unnamed Module"}</Text>
          {module.description ? (
            <Text className="text-sm text-muted-foreground">
              {module.description}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1">
            <Badge variant="secondary">
              <Text>Triggers: {module.trigger.length}</Text>
            </Badge>
            <Badge variant="secondary">
              <Text>Regex: {module.regex.length}</Text>
            </Badge>
            {module.cjs ? (
              <Badge variant="secondary">
                <Text>CJS Code</Text>
              </Badge>
            ) : null}
            {module.low_level_access && (
              <Badge variant="destructive">
                <Text>Low-Level Access</Text>
              </Badge>
            )}
          </View>
        </CardContent>
      </Card>

      <View className="flex-row gap-1">
        <TabButton
          label="Triggers"
          count={module.trigger.length}
          active={subTab === "triggers"}
          onPress={() => setSubTab("triggers")}
        />
        <TabButton
          label="Regex"
          count={module.regex.length}
          active={subTab === "regex"}
          onPress={() => setSubTab("regex")}
        />
        <TabButton
          label="Code"
          active={subTab === "code"}
          onPress={() => setSubTab("code")}
        />
      </View>

      {subTab === "triggers" && (
        <View className="gap-2">
          {module.trigger.length === 0 ? (
            <Text className="text-muted-foreground text-sm">No triggers</Text>
          ) : (
            module.trigger.map((t, i) => (
              <CollapsibleSection
                key={i}
                title={`Trigger ${i + 1}: ${(t as Record<string, unknown>).name || ""}`}
              >
                <ScrollView horizontal>
                  <Text className="text-xs font-mono">
                    {JSON.stringify(t, null, 2)}
                  </Text>
                </ScrollView>
              </CollapsibleSection>
            ))
          )}
        </View>
      )}

      {subTab === "regex" && (
        <View className="gap-2">
          {module.regex.length === 0 ? (
            <Text className="text-muted-foreground text-sm">No regex patterns</Text>
          ) : (
            module.regex.map((r, i) => (
              <CollapsibleSection
                key={i}
                title={`Regex ${i + 1}: ${(r as Record<string, unknown>).name || ""}`}
              >
                <ScrollView horizontal>
                  <Text className="text-xs font-mono">
                    {JSON.stringify(r, null, 2)}
                  </Text>
                </ScrollView>
              </CollapsibleSection>
            ))
          )}
        </View>
      )}

      {subTab === "code" && (
        <View className="bg-muted/50 rounded-lg p-3">
          {module.cjs ? (
            <ScrollView horizontal>
              <Text className="text-xs font-mono">{module.cjs}</Text>
            </ScrollView>
          ) : (
            <Text className="text-muted-foreground text-sm">
              No CommonJS code
            </Text>
          )}
        </View>
      )}

      {(module.id || module.namespace) && (
        <View className="border-t border-border pt-2">
          {module.id ? (
            <Text className="text-xs text-muted-foreground">ID: {module.id}</Text>
          ) : null}
          {module.namespace ? (
            <Text className="text-xs text-muted-foreground">
              Namespace: {module.namespace}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function CharXViewer() {
  const params = useLocalSearchParams<{ fileUri: string; fileName: string }>();
  const fileUri = params.fileUri ?? "";
  const fileName = params.fileName ?? "character.charx";

  const [parsed, setParsed] = useState<ParsedCharX | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>("character");

  useEffect(() => {
    if (!fileUri) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await parseCharXFromUri(fileUri);
        if (!cancelled) setParsed(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to parse .charx file");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  const characterName = parsed?.card?.data.name ?? fileName.replace(/\.charx$/i, "");

  // Get avatar
  let avatarUri: string | null = null;
  if (parsed?.card) {
    const iconAsset = parsed.card.data.assets.find((a) => a.type === "icon");
    if (iconAsset) {
      const uri = iconAsset.uri.replace("embeded://", "");
      const data = parsed.assets.get(uri);
      if (data) avatarUri = assetToDataUrl(data, uri);
    }
    if (!avatarUri && parsed.assets.size > 0) {
      const first = parsed.assets.entries().next().value;
      if (first) avatarUri = assetToDataUrl(first[1], first[0]);
    }
  }

  const hasLorebook =
    parsed?.card?.data.character_book &&
    parsed.card.data.character_book.entries.length > 0;
  const hasAssets = parsed && parsed.assets.size > 0;
  const hasModule = parsed?.module !== null;

  const tabs: { key: MainTab; label: string; count?: number }[] = [
    { key: "character", label: "Character" },
  ];
  if (hasLorebook) {
    tabs.push({
      key: "lorebook",
      label: "Lorebook",
      count: parsed!.card!.data.character_book!.entries.length,
    });
  }
  if (hasAssets) {
    tabs.push({ key: "assets", label: "Assets", count: parsed!.assets.size });
  }
  if (hasModule) {
    tabs.push({ key: "module", label: "Module" });
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: characterName }} />

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-2">
            Parsing {fileName}...
          </Text>
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-destructive text-lg font-semibold mb-2">
            Error
          </Text>
          <Text className="text-muted-foreground text-center">{error}</Text>
        </View>
      )}

      {!loading && !error && parsed && (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 gap-4 pb-8"
        >
          {/* Avatar + Name header */}
          <View className="flex-row items-center gap-3">
            {avatarUri && (
              <Image
                source={{ uri: avatarUri }}
                className="w-16 h-16 rounded-xl"
                resizeMode="cover"
              />
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold">{characterName}</Text>
              {parsed.card?.data.creator ? (
                <Text className="text-sm text-muted-foreground">
                  by {parsed.card.data.creator}
                </Text>
              ) : null}
            </View>
          </View>

          <Separator />

          {/* Main tabs */}
          <View className="flex-row gap-1">
            {tabs.map((t) => (
              <TabButton
                key={t.key}
                label={t.label}
                count={t.count}
                active={activeTab === t.key}
                onPress={() => setActiveTab(t.key)}
              />
            ))}
          </View>

          {/* Tab content */}
          {activeTab === "character" && parsed.card && (
            <CharacterTab card={parsed.card} />
          )}

          {activeTab === "lorebook" && hasLorebook && (
            <LorebookTab lorebook={parsed.card!.data.character_book!} />
          )}

          {activeTab === "assets" && hasAssets && (
            <AssetsTab parsed={parsed} />
          )}

          {activeTab === "module" && hasModule && (
            <ModuleTab module={parsed.module!} />
          )}
        </ScrollView>
      )}
    </View>
  );
}
