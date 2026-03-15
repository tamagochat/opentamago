"use client";

import { memo, useEffect, useState } from "react";
import { UserCircle, Pencil, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useDatabase } from "~/lib/db";
import { usePersonas } from "~/lib/db/hooks";
import { useSettings } from "~/lib/db/hooks/useSettings";
import { PersonaEditor } from "~/app/[locale]/chat/_components/persona-editor";
import type { PersonaDocument } from "~/lib/db/schemas";

interface SettingsLeftPanelProps {
  compact?: boolean;
}

interface DatabaseStats {
  characters: number;
  personas: number;
  chats: number;
  messages: number;
  memories: number;
}

export const SettingsLeftPanel = memo(function SettingsLeftPanel({ compact = false }: SettingsLeftPanelProps) {
  const t = useTranslations("settings");
  const { db } = useDatabase();
  const { personas } = usePersonas();
  const { settings, updateSettings } = useSettings();
  const [stats, setStats] = useState<DatabaseStats>({
    characters: 0,
    personas: 0,
    chats: 0,
    messages: 0,
    memories: 0,
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaDocument | null>(null);

  // Get default persona
  const defaultPersona = personas.find((p) => p.id === settings.defaultPersonaId);

  // Load database stats
  useEffect(() => {
    if (!db) return;

    const loadStats = async () => {
      const [characters, personasCount, chats, messages, memories] = await Promise.all([
        db.characters.count().exec(),
        db.personas.count().exec(),
        db.chats.count().exec(),
        db.messages.count().exec(),
        db.memories.count().exec(),
      ]);

      setStats({
        characters,
        personas: personasCount,
        chats,
        messages,
        memories,
      });
    };

    void loadStats();
  }, [db]);

  const handleEditPersona = () => {
    if (defaultPersona) {
      setEditingPersona(defaultPersona as PersonaDocument);
    }
    setIsEditorOpen(true);
  };

  const handleCreatePersona = () => {
    setEditingPersona(null);
    setIsEditorOpen(true);
  };

  const handleSavePersona = async (persona: PersonaDocument) => {
    // If this is a new persona and no default is set, make it the default
    if (!settings.defaultPersonaId) {
      await updateSettings({ defaultPersonaId: persona.id });
    }
    setIsEditorOpen(false);
  };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {defaultPersona?.avatarData ? (
                <AvatarImage src={defaultPersona.avatarData} alt={defaultPersona.name} />
              ) : null}
              <AvatarFallback>
                {defaultPersona ? (
                  defaultPersona.name.charAt(0).toUpperCase()
                ) : (
                  <UserCircle className="h-6 w-6" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {defaultPersona?.name ?? t("leftPanel.noDefaultPersona")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("leftPanel.defaultPersona")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleEditPersona}>
              <Pencil className="h-3 w-3 mr-1" />
              {t("leftPanel.editPersona")}
            </Button>
          </div>
        </CardContent>

        <PersonaEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          persona={editingPersona}
          onSave={handleSavePersona}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Persona Card */}
      <Card>
        <CardContent className="p-6 text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            {defaultPersona?.avatarData ? (
              <AvatarImage src={defaultPersona.avatarData} alt={defaultPersona.name} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {defaultPersona ? (
                defaultPersona.name.charAt(0).toUpperCase()
              ) : (
                <UserCircle className="h-10 w-10" />
              )}
            </AvatarFallback>
          </Avatar>

          <h3 className="font-semibold text-lg mb-1">
            {defaultPersona?.name ?? t("leftPanel.noDefaultPersona")}
          </h3>

          {defaultPersona?.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {defaultPersona.description}
            </p>
          )}

          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Star className="h-3 w-3" />
            {t("leftPanel.defaultPersona")}
          </div>

          <div className="flex gap-2 justify-center">
            {defaultPersona ? (
              <Button variant="outline" size="sm" onClick={handleEditPersona}>
                <Pencil className="h-3 w-3 mr-1" />
                {t("leftPanel.editPersona")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleCreatePersona}>
                {t("personas.create")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("leftPanel.stats")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Characters</span>
            <span className="font-medium">{stats.characters}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Personas</span>
            <span className="font-medium">{stats.personas}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chats</span>
            <span className="font-medium">{stats.chats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Messages</span>
            <span className="font-medium">{stats.messages}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Memories</span>
            <span className="font-medium">{stats.memories}</span>
          </div>
        </CardContent>
      </Card>

      <PersonaEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        persona={editingPersona}
        onSave={handleSavePersona}
      />
    </div>
  );
});
