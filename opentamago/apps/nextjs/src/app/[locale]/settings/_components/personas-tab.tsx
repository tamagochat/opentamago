"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star, MoreHorizontal, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { usePersonas } from "~/lib/db/hooks";
import { useSettings } from "~/lib/db/hooks/useSettings";
import { PersonaEditor } from "~/app/[locale]/chat/_components/persona-editor";
import type { PersonaDocument } from "~/lib/db/schemas";

export function PersonasTab() {
  const t = useTranslations("settings.personas");
  const tActions = useTranslations("actions");
  const { personas, deletePersona, isLoading } = usePersonas();
  const { settings, updateSettings } = useSettings();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaDocument | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<PersonaDocument | null>(null);

  const handleCreate = () => {
    setEditingPersona(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (persona: PersonaDocument) => {
    setEditingPersona(persona);
    setIsEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPersona) return;

    await deletePersona(deletingPersona.id);

    // If we deleted the default persona, clear the default
    if (settings.defaultPersonaId === deletingPersona.id) {
      await updateSettings({ defaultPersonaId: undefined });
    }

    setDeletingPersona(null);
  };

  const handleSetDefault = async (persona: PersonaDocument) => {
    await updateSettings({ defaultPersonaId: persona.id });
  };

  const handleSavePersona = async (persona: PersonaDocument) => {
    // If this is a new persona and no default is set, make it the default
    if (!settings.defaultPersonaId) {
      await updateSettings({ defaultPersonaId: persona.id });
    }
    setIsEditorOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {personas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t("empty")}</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t("create")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona) => {
                const isDefault = settings.defaultPersonaId === persona.id;

                return (
                  <Card key={persona.id} className="relative">
                    {isDefault && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          <Star className="h-3 w-3 fill-current" />
                          {t("isDefault")}
                        </div>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          {persona.avatarData ? (
                            <AvatarImage src={persona.avatarData} alt={persona.name} />
                          ) : null}
                          <AvatarFallback>
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{persona.name}</h4>
                          {persona.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {persona.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(persona as PersonaDocument)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {tActions("edit")}
                            </DropdownMenuItem>
                            {!isDefault && (
                              <DropdownMenuItem onClick={() => handleSetDefault(persona as PersonaDocument)}>
                                <Star className="h-4 w-4 mr-2" />
                                {t("setAsDefault")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingPersona(persona as PersonaDocument)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tActions("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persona Editor Dialog */}
      <PersonaEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        persona={editingPersona}
        onSave={handleSavePersona}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPersona} onOpenChange={() => setDeletingPersona(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmation", { name: deletingPersona?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tActions("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
