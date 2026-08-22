import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiService, CharacterRecord } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const blankCharacter = {
  name: "",
  epic: "Ramayana",
  category: "Major Heroes & Guides",
  role: "",
  subtitle: "",
  icon: "📜",
  color: "#D4AF37",
  accent: "rgba(212, 175, 55, 0.15)",
  quote: "",
  is_active: true,
  display_order: 0,
};

type CharacterImport = Omit<
  CharacterRecord,
  | "id"
  | "slug"
  | "image_url"
  | "cloudinary_public_id"
  | "created_at"
  | "updated_at"
> & { image_url?: string | null };
type BulkRow = CharacterImport & {
  selectedImage?: { file: Blob; name: string };
};

const importFields = [
  "name",
  "epic",
  "category",
  "role",
  "subtitle",
  "icon",
  "quote",
  "color",
  "accent",
  "image_url",
  "is_active",
] as const;

export function CharacterAdminPanel() {
  const { theme } = useTheme();
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [draft, setDraft] = useState(blankCharacter);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkRow[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [draftImage, setDraftImage] = useState<{
    file: Blob;
    name: string;
  } | null>(null);
  const [dirtyCharacterIds, setDirtyCharacterIds] = useState<Set<string>>(
    new Set(),
  );

  const load = async () => {
    setLoading(true);
    try {
      setCharacters(await apiService.fetchAdminCharacters());
      setDirtyCharacterIds(new Set());
    } catch (error: any) {
      setMessage(error.message || "Could not load characters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateLocal = (
    id: string,
    field: keyof CharacterRecord,
    value: string | boolean,
  ) => {
    setDirtyCharacterIds((ids) => new Set(ids).add(id));
    setCharacters((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const save = async (character: CharacterRecord) => {
    setSavingId(character.id);
    try {
      const saved = await apiService.updateAdminCharacter(character.id, {
        name: character.name,
        epic: character.epic,
        category: character.category,
        role: character.role,
        subtitle: character.subtitle,
        icon: character.icon,
        color: character.color,
        accent: character.accent,
        quote: character.quote,
        is_active: character.is_active,
        display_order: Number(character.display_order),
      });
      setCharacters((items) =>
        items.map((item) => (item.id === saved.id ? saved : item)),
      );
      setDirtyCharacterIds((ids) => {
        const next = new Set(ids);
        next.delete(character.id);
        return next;
      });
      setMessage(`${saved.name} saved`);
    } catch (error: any) {
      setMessage(error.message || "Could not save character");
    } finally {
      setSavingId(null);
    }
  };

  const create = async () => {
    if (!draft.name.trim() || !draft.role.trim() || !draft.quote.trim()) {
      setMessage("Name, role, and quote are required");
      return;
    }
    try {
      const createdBase = await apiService.createAdminCharacter(draft);
      const created = draftImage
        ? await apiService.uploadAdminCharacterImage(
            createdBase.id,
            draftImage.file,
            draftImage.name,
          )
        : createdBase;
      setCharacters((items) =>
        [...items, created].sort((a, b) => a.display_order - b.display_order),
      );
      setDraft(blankCharacter);
      setDraftImage(null);
      setMessage(`${created.name} created`);
    } catch (error: any) {
      setMessage(error.message || "Could not create character");
    }
  };

  const chooseDraftImage = () => {
    if (Platform.OS !== "web") {
      setMessage(
        "Image upload is currently available from the web admin panel",
      );
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setDraftImage({ file, name: file.name });
    };
    input.click();
  };

  const readBulkJson = async (file: File) => {
    setMessage("");
    setBulkErrors([]);
    try {
      const parsed = JSON.parse(await file.text());
      const rawItems = Array.isArray(parsed) ? parsed : parsed?.characters;
      if (!Array.isArray(rawItems))
        throw new Error(
          'JSON must be an array or contain a "characters" array',
        );
      if (rawItems.length === 0)
        throw new Error("The JSON file contains no characters");
      if (rawItems.length > 500)
        throw new Error("A maximum of 500 characters can be imported at once");

      const errors: string[] = [];
      const names = new Set<string>();
      const normalized = rawItems.map((item: any, index: number) => {
        const value: CharacterImport = {
          name: String(item?.name ?? "").trim(),
          epic: String(item?.epic ?? "").trim(),
          category: String(item?.category ?? "").trim(),
          role: String(item?.role ?? "").trim(),
          subtitle: String(item?.subtitle ?? "").trim(),
          icon: String(item?.icon ?? "📜").trim(),
          color: item?.color ?? "#D4AF37",
          accent: item?.accent ?? "rgba(212, 175, 55, 0.15)",
          quote: String(item?.quote ?? "").trim(),
          image_url: item?.image_url ?? item?.imageUrl ?? null,
          is_active: item?.is_active ?? item?.isActive ?? true,
          display_order: Number(
            item?.display_order ?? item?.displayOrder ?? index,
          ),
        };
        const missing = importFields.filter((field) =>
          field === "is_active"
            ? value[field] === undefined || value[field] === null
            : !value[field],
        );
        if (missing.length > 0)
          errors.push(`Row ${index + 1}: missing ${missing.join(", ")}`);
        const key = value.name.toLocaleLowerCase();
        if (key && names.has(key))
          errors.push(`Row ${index + 1}: duplicate name "${value.name}"`);
        if (key) names.add(key);
        if (!Number.isInteger(value.display_order) || value.display_order < 0)
          errors.push(
            `Row ${index + 1}: display_order must be a non-negative integer`,
          );
        return value;
      });
      setBulkPreview(normalized);
      setBulkErrors(errors);
      setMessage(
        errors.length
          ? "Review the import errors before submitting"
          : `${normalized.length} characters ready to import`,
      );
    } catch (error: any) {
      setBulkPreview([]);
      setBulkErrors([error.message || "Could not read JSON file"]);
    }
  };

  const chooseBulkJson = () => {
    if (Platform.OS !== "web") {
      setMessage(
        "Bulk JSON import is currently available from the web admin panel",
      );
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await readBulkJson(file);
    };
    input.click();
  };

  const updateBulkRow = (
    index: number,
    field: keyof CharacterImport,
    value: string,
  ) => {
    setBulkPreview((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]:
                field === "display_order"
                  ? Number(value)
                  : field === "is_active"
                    ? value !== "false"
                    : value,
            }
          : row,
      ),
    );
    setBulkErrors([]);
  };

  const chooseBulkImage = (index: number) => {
    if (Platform.OS !== "web")
      return setMessage(
        "Bulk image selection is currently available from the web admin panel",
      );
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file)
        setBulkPreview((rows) =>
          rows.map((row, rowIndex) =>
            rowIndex === index
              ? {
                  ...row,
                  selectedImage: { file, name: file.name },
                  image_url: null,
                }
              : row,
          ),
        );
    };
    input.click();
  };

  const removeBulkRow = (index: number) =>
    setBulkPreview((rows) => rows.filter((_, rowIndex) => rowIndex !== index));

  const validateBulkRows = () => {
    const errors: string[] = [];
    const names = new Set<string>();
    bulkPreview.forEach((row, index) => {
      const missing = importFields.filter((field) =>
        field === "is_active"
          ? row[field] === undefined || row[field] === null
          : !row[field],
      );
      if (missing.length)
        errors.push(`Row ${index + 1}: missing ${missing.join(", ")}`);
      const name = row.name.toLocaleLowerCase();
      if (names.has(name))
        errors.push(`Row ${index + 1}: duplicate name "${row.name}"`);
      if (name) names.add(name);
      if (!Number.isInteger(row.display_order) || row.display_order < 0)
        errors.push(
          `Row ${index + 1}: display order must be a non-negative integer`,
        );
    });
    setBulkErrors(errors);
    return errors;
  };

  const submitBulkImport = async () => {
    if (!bulkPreview.length || validateBulkRows().length) return;
    setBulkImporting(true);
    setMessage("");
    try {
      const images = new Map<number, { file: Blob; name: string }>();
      bulkPreview.forEach((row, index) => {
        if (row.selectedImage) images.set(index, row.selectedImage);
      });
      const saved = await apiService.bulkImportAdminCharacters(
        bulkPreview.map(({ selectedImage, ...row }) => row),
        images,
      );
      setCharacters((items) => {
        const byName = new Map(
          items.map((item) => [item.name.toLocaleLowerCase(), item]),
        );
        saved.forEach((item) =>
          byName.set(item.name.toLocaleLowerCase(), item),
        );
        return Array.from(byName.values()).sort(
          (a, b) => a.display_order - b.display_order,
        );
      });
      setBulkPreview([]);
      setMessage(`${saved.length} characters imported successfully`);
    } catch (error: any) {
      setMessage(error.message || "Bulk import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  const upload = (character: CharacterRecord) => {
    if (Platform.OS !== "web") {
      setMessage(
        "Image upload is currently available from the web admin panel",
      );
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setSavingId(character.id);
      try {
        const saved = await apiService.uploadAdminCharacterImage(
          character.id,
          file,
          file.name,
        );
        setCharacters((items) =>
          items.map((item) => (item.id === saved.id ? saved : item)),
        );
        setMessage(`${saved.name} image uploaded`);
      } catch (error: any) {
        setMessage(error.message || "Could not upload image");
      } finally {
        setSavingId(null);
      }
    };
    input.click();
  };

  const remove = async (character: CharacterRecord) => {
    if (Platform.OS === "web" && !window.confirm(`Delete ${character.name}?`))
      return;
    try {
      await apiService.deleteAdminCharacter(character.id);
      setCharacters((items) =>
        items.filter((item) => item.id !== character.id),
      );
    } catch (error: any) {
      setMessage(error.message || "Could not delete character");
    }
  };

  const field = (
    label: string,
    value: string | number | undefined | null,
    onChange: (value: string) => void,
    multiline = false,
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        value={String(value ?? "")}
        onChangeText={onChange}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.outlineVariant,
            backgroundColor: theme.inputBg,
          },
          multiline && styles.multiline,
        ]}
      />
    </View>
  );


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Character Catalog
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Manage the live personas shown in the app.
      </Text>
      {!!message && (
        <Text style={[styles.message, { color: theme.accent }]}>{message}</Text>
      )}
      <View
        style={[
          styles.createBox,
          { borderColor: theme.outlineVariant, backgroundColor: theme.surface },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Add character
        </Text>
        <View style={styles.grid}>
          {field("Name", draft.name, (v) => setDraft({ ...draft, name: v }))}
          {field("Epic", draft.epic, (v) => setDraft({ ...draft, epic: v }))}
          {field("Category", draft.category, (v) =>
            setDraft({ ...draft, category: v }),
          )}
          {field("Role", draft.role, (v) => setDraft({ ...draft, role: v }))}
          {field("Subtitle", draft.subtitle, (v) =>
            setDraft({ ...draft, subtitle: v }),
          )}
          {field("Icon", draft.icon, (v) => setDraft({ ...draft, icon: v }))}
        </View>
        {field(
          "Quote",
          draft.quote,
          (v) => setDraft({ ...draft, quote: v }),
          true,
        )}
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.accent }]}
          onPress={chooseDraftImage}
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>
            {draftImage
              ? `Image selected: ${draftImage.name}`
              : "Choose image (optional)"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={create}
        >
          <Text style={styles.buttonText}>Create character</Text>
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.createBox,
          { borderColor: theme.outlineVariant, backgroundColor: theme.surface },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Bulk JSON import
        </Text>
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          Load an array of character records, review it, and submit everything
          together.
        </Text>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.accent }]}
          onPress={chooseBulkJson}
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>
            Choose JSON file
          </Text>
        </TouchableOpacity>
        {!!bulkErrors.length &&
          bulkErrors.map((error) => (
            <Text key={error} style={styles.errorText}>
              {error}
            </Text>
          ))}
        {!!bulkPreview.length && (
          <>
            <Text style={[styles.previewText, { color: theme.text }]}>
              {bulkPreview.length} editable records
            </Text>
            <ScrollView
              horizontal
              style={styles.tableScroll}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View
                style={[styles.table, { borderColor: theme.outlineVariant }]}
              >
                <View
                  style={[
                    styles.tableRow,
                    styles.tableHeader,
                    { backgroundColor: theme.inputBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      styles.indexCell,
                      { color: theme.textSecondary },
                    ]}
                  >
                    #
                  </Text>
                  {importFields.map((key) => (
                    <Text
                      key={key}
                      style={[
                        styles.tableHeaderCell,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {key}
                    </Text>
                  ))}
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { color: theme.textSecondary },
                    ]}
                  >
                    display_order
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { color: theme.textSecondary },
                    ]}
                  >
                    upload image
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { color: theme.textSecondary },
                    ]}
                  >
                    remove
                  </Text>
                </View>
                <ScrollView nestedScrollEnabled style={styles.tableBody}>
                  {bulkPreview.map((row, index) => (
                    <View
                      key={`${row.name}-${index}`}
                      style={[
                        styles.tableRow,
                        { borderTopColor: theme.outlineVariant },
                      ]}
                    >
                      <Text
                        style={[
                          styles.indexCell,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                      {importFields.map((key) => (
                        <TextInput
                          key={key}
                          value={String(row[key] ?? "")}
                          onChangeText={(value) =>
                            updateBulkRow(index, key, value)
                          }
                          multiline={key === "quote"}
                          style={[
                            styles.tableInput,
                            {
                              color: theme.text,
                              borderColor: theme.outlineVariant,
                              backgroundColor: theme.inputBg,
                            },
                            key === "quote" && styles.quoteCell,
                          ]}
                        />
                      ))}
                      <TextInput
                        value={String(row.display_order)}
                        onChangeText={(value) =>
                          updateBulkRow(index, "display_order", value)
                        }
                        keyboardType="number-pad"
                        style={[
                          styles.tableInput,
                          {
                            color: theme.text,
                            borderColor: theme.outlineVariant,
                            backgroundColor: theme.inputBg,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        style={[
                          styles.rowButton,
                          { borderColor: theme.accent },
                        ]}
                        onPress={() => chooseBulkImage(index)}
                      >
                        <Text
                          style={[styles.actionText, { color: theme.accent }]}
                        >
                          {row.selectedImage ? "Change" : "Upload"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.removeButton,
                          { borderColor: "#EF4444" },
                        ]}
                        onPress={() => removeBulkRow(index)}
                      >
                        <Text style={{ color: "#EF4444", fontSize: 18 }}>
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.accent }]}
              onPress={submitBulkImport}
              disabled={bulkImporting}
            >
              <Text style={styles.buttonText}>
                {bulkImporting
                  ? "Importing..."
                  : `Submit ${bulkPreview.length} characters`}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <ScrollView
          horizontal
          style={styles.catalogScroll}
          contentContainerStyle={styles.catalogScrollContent}
        >
          <View
            style={[
              styles.table,
              styles.catalogTable,
              { borderColor: theme.outlineVariant },
            ]}
          >
            <View
              style={[
                styles.tableRow,
                styles.tableHeader,
                { backgroundColor: theme.inputBg },
              ]}
            >
              {[
                "#",
                "Preview",
                "Name",
                "Epic",
                "Category",
                "Role",
                "Subtitle",
                "Order",
                "Quote",
                "Status",
                "Upload",
                "Save",
                "Delete",
              ].map((label, index) => (
                <Text
                  key={label}
                  style={[
                    styles.tableHeaderCell,
                    index === 0 && styles.indexCell,
                    index === 7 && styles.catalogQuoteHeader,
                    { color: theme.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>
            <ScrollView nestedScrollEnabled style={styles.catalogBody}>
              {characters.map((character, index) => (
                <View
                  key={character.id}
                  style={[
                    styles.tableRow,
                    { borderTopColor: theme.outlineVariant },
                  ]}
                >
                
                  <Text
                    style={[styles.indexCell, { color: theme.textSecondary }]}
                  >
                    {index + 1}
                  </Text>
                  <View style={styles.imageCell}>
                    {character.image_url ? (
                      <Image
                        source={{ uri: character.image_url }}
                        style={styles.characterImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.noImageText}>No image</Text>
                    )}
                  </View>
                  {(
                    ["name", "epic", "category", "role", "subtitle"] as const
                  ).map((key) => (
                    <TextInput
                      key={key}
                      value={character[key]}
                      onChangeText={(value) =>
                        updateLocal(character.id, key, value)
                      }
                      style={[
                        styles.tableInput,
                        {
                          color: theme.text,
                          borderColor: theme.outlineVariant,
                          backgroundColor: theme.inputBg,
                        },
                      ]}
                    />
                  ))}
                  <TextInput
                    value={String(character.display_order)}
                    onChangeText={(value) =>
                      updateLocal(character.id, "display_order", value)
                    }
                    keyboardType="number-pad"
                    style={[
                      styles.tableInput,
                      {
                        color: theme.text,
                        borderColor: theme.outlineVariant,
                        backgroundColor: theme.inputBg,
                      },
                    ]}
                  />
                  <TextInput
                    value={character.quote}
                    onChangeText={(value) =>
                      updateLocal(character.id, "quote", value)
                    }
                    multiline
                    style={[
                      styles.tableInput,
                      styles.catalogQuoteCell,
                      {
                        color: theme.text,
                        borderColor: theme.outlineVariant,
                        backgroundColor: theme.inputBg,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.rowButton,
                      {
                        borderColor: character.is_active
                          ? "#10B981"
                          : "#EF4444",
                      },
                    ]}
                    onPress={() =>
                      updateLocal(
                        character.id,
                        "is_active",
                        !character.is_active,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.actionText,
                        { color: character.is_active ? "#10B981" : "#EF4444" },
                      ]}
                    >
                      {character.is_active ? "Active" : "Hidden"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rowButton, { borderColor: theme.accent }]}
                    onPress={() => upload(character)}
                  >
                    <Text style={[styles.actionText, { color: theme.accent }]}>
                      {savingId === character.id ? "..." : "Upload"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.rowButton,
                      {
                        backgroundColor: dirtyCharacterIds.has(character.id)
                          ? theme.accent
                          : theme.outlineVariant,
                        opacity: dirtyCharacterIds.has(character.id) ? 1 : 0.55,
                      },
                    ]}
                    onPress={() => save(character)}
                    disabled={
                      savingId === character.id ||
                      !dirtyCharacterIds.has(character.id)
                    }
                  >
                    <Text style={styles.buttonText}>
                      {savingId === character.id ? "..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeButton, { borderColor: "#EF4444" }]}
                    onPress={() => remove(character)}
                  >
                    <Text style={{ color: "#EF4444", fontSize: 18 }}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80, gap: 14 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: 4 },
  fieldGroup: { flexGrow: 1, flexBasis: 180, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700" },
  helpText: { fontSize: 13, lineHeight: 19 },
  previewText: { fontSize: 12, lineHeight: 20 },
  errorText: { color: "#EF4444", fontSize: 12, lineHeight: 19 },
  tableScroll: { height: 560, maxHeight: 560 },
  tableScrollContent: { minHeight: 560 },
  table: { borderWidth: 1, minWidth: 2520 },
  tableBody: { height: 520 },
  catalogScroll: { height: 600, maxHeight: 600 },
  catalogScrollContent: { minHeight: 600 },
  catalogBody: { height: 560 },
  catalogTable: { minWidth: 2200 },
  catalogQuoteHeader: { width: 300 },
  catalogQuoteCell: { width: 300, minHeight: 52 },
  imageCell: { width: 160, height: 58, alignItems: "center", justifyContent: "center" },
  characterImage: { width: 42, height: 52, borderRadius: 4 },
  noImageText: { color: "#888888", fontSize: 11 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    minHeight: 58,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 6,
  },
  tableHeader: { borderTopWidth: 0, minHeight: 36 },
  tableHeaderCell: { width: 160, fontSize: 11, fontWeight: "700" },
  indexCell: { width: 30, textAlign: "center", fontSize: 12 },
  tableInput: {
    width: 160,
    minHeight: 40,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 6,
    fontSize: 12,
  },
  quoteCell: { width: 260, minHeight: 50 },
  rowButton: {
    width: 90,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: "center",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: { fontSize: 13 },
  createBox: { borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  card: { borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 19, fontWeight: "700" },
  status: { fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexGrow: 1,
    flexBasis: 180,
    fontSize: 13,
  },
  multiline: { minHeight: 72, width: "100%", flexBasis: "100%" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  actionText: { fontWeight: "700", fontSize: 12 },
});
