import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { HomeMember, MemberRole } from "@/features/home/home-types";
import {
  useDeleteHome,
  useHome,
  useHomeMembers,
  useLeaveHome,
  useRemoveMember,
  useRenameHome,
  useSetMemberRole,
} from "@/features/home/hooks/use-home";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

// Se kommentaren i (no-home)/create-home.tsx för valet av behavior.
// keyboardVerticalOffset = headerHeight därför att KeyboardAvoidingView mäter
// sin ram med onLayout, som ger koordinater relativt FÖRÄLDERN. frame.y blir
// 0 fast innehållet börjar nedanför headern, så utan offseten
// underkompenserar den med exakt header-höjden.
//
// Skärmen ligger dessutom under <Tabs>; flikfältet döljs när tangentbordet
// kommer upp, se tabBarHideOnKeyboard i (authorized)/_layout.tsx.
const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Ägare",
  member: "Medlem",
};

const errorText = (
  error: { code?: string; message: string } | null,
  fallback: string,
) => {
  if (!error) return null;
  // Alla raise exception i migrationerna är skrivna för att visas rakt upp.
  return error.code === "P0001" ? error.message : fallback;
};

const ManageHome = () => {
  const router = useRouter();
  const user = useAuthorizedUser();
  const { data: home, isPending: homePending } = useHome();
  const members = useHomeMembers(home?.id);

  const rename = useRenameHome();
  const setRole = useSetMemberRole();
  const leave = useLeaveHome();
  const remove = useDeleteHome();
  const removeMember = useRemoveMember();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const headerHeight = useHeaderHeight();

  // undefined och null betyder olika saker här, och att blanda dem gav en
  // spinner som aldrig tog slut: efter att man lämnat hemmet är null det
  // RIKTIGA svaret, inte ett mellanläge att vänta ut.
  if (homePending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Hemmet är lämnat eller raderat. Guarden i root-layouten flyttar oss till
  // (no-home) i samma veva — rendera inget i mellantiden.
  if (!home) return null;

  const isOwner = home.role === "owner";
  const owners = members.data?.filter((m) => m.role === "owner").length ?? 0;
  // Medlemslistan kan vara ofylld; då är "ensam" inte bevisat, så vi antar
  // motsatsen och döljer raderingen hellre än att erbjuda ett säkert fel.
  const isAlone = members.data?.length === 1;

  const confirmLeave = () =>
    Alert.alert(
      "Lämna hemmet?",
      isAlone
        ? "Du är ensam medlem, så hemmet och allt i det raderas. Det går inte att ångra."
        : "Du behöver en ny inbjudan för att komma tillbaka.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: isAlone ? "Lämna och radera" : "Lämna",
          style: "destructive",
          onPress: () => leave.mutate(),
        },
      ],
    );

  const changeRole = (member: HomeMember) => {
    const role: MemberRole = member.role === "owner" ? "member" : "owner";
    const run = () =>
      setRole.mutate({ homeId: home.id, userId: member.userId, role });

    // Att degradera sig själv går inte att ångra själv — bara en annan ägare
    // kan ge tillbaka rollen.
    if (member.userId === user.id && role === "member") {
      Alert.alert(
        "Sluta vara ägare?",
        "Du kan inte längre bjuda in, byta roller eller byta namn på hemmet. Bara en annan ägare kan göra dig till ägare igen.",
        [
          { text: "Avbryt", style: "cancel" },
          { text: "Gör mig till medlem", style: "destructive", onPress: run },
        ],
      );
      return;
    }
    run();
  };

  const confirmRemove = (member: HomeMember) =>
    Alert.alert(
      `Ta bort ${member.displayName}?`,
      "Hen förlorar tillgången till hemmets recept, veckoplan och inköpslista, och behöver en ny inbjudan för att komma tillbaka.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta bort",
          style: "destructive",
          onPress: () =>
            removeMember.mutate({ homeId: home.id, userId: member.userId }),
        },
      ],
    );

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      className="flex-1"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentContainerClassName="grow gap-6 px-4 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- Namn ---- */}
        <View className="gap-2">
          <Label>Hemmets namn</Label>
          {nameDraft === null ? (
            <View className="flex-row items-center justify-between gap-2">
              <Typography.Heading
                type="h2"
                weight="semibold"
                className="flex-1"
              >
                {home.name}
              </Typography.Heading>
              {isOwner && (
                <Button
                  variant="tertiary"
                  className="rounded-xl bg-field p-2"
                  accessibilityLabel="Byt namn på hemmet"
                  onPress={() => setNameDraft(home.name)}
                >
                  <StyledIonicons name="pencil-outline" size={20} />
                </Button>
              )}
            </View>
          ) : (
            <View className="gap-2">
              <TextField isInvalid={!!rename.error}>
                <Input
                  value={nameDraft}
                  maxLength={60}
                  onChangeText={setNameDraft}
                  autoCapitalize="sentences"
                  autoFocus
                />
                <FieldError>
                  {errorText(rename.error, "Kunde inte byta namn")}
                </FieldError>
              </TextField>
              <View className="flex-row gap-2">
                <Button
                  variant="tertiary"
                  className="flex-1 rounded-2xl bg-field"
                  onPress={() => {
                    setNameDraft(null);
                    rename.reset();
                  }}
                >
                  <Typography.Paragraph>Avbryt</Typography.Paragraph>
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 rounded-2xl"
                  isDisabled={rename.isPending || nameDraft.trim().length === 0}
                  onPress={() =>
                    rename.mutate(
                      { homeId: home.id, name: nameDraft.trim() },
                      { onSuccess: () => setNameDraft(null) },
                    )
                  }
                >
                  <Typography.Paragraph className="text-white">
                    Spara
                  </Typography.Paragraph>
                </Button>
              </View>
            </View>
          )}
        </View>

        <Separator />

        {/* ---- Medlemmar ---- */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>Medlemmar</Label>
            {isOwner && (
              <Button
                variant="tertiary"
                className="rounded-xl bg-field"
                onPress={() => router.push("/invite-to-home")}
              >
                <StyledIonicons name="person-add-outline" size={16} />
                <Typography.Paragraph type="body-sm">
                  Bjud in
                </Typography.Paragraph>
              </Button>
            )}
          </View>

          {members.isPending && <ActivityIndicator />}
          {members.isError && (
            <View className="flex-row items-center justify-between gap-2">
              <Typography.Paragraph type="body-sm" color="muted">
                Kunde inte läsa medlemmarna.
              </Typography.Paragraph>
              <Button
                variant="tertiary"
                className="rounded-xl bg-field"
                onPress={() => members.refetch()}
              >
                <Typography.Paragraph type="body-sm">
                  Försök igen
                </Typography.Paragraph>
              </Button>
            </View>
          )}

          <View className="gap-2">
            {members.data?.map((member) => {
              const isMe = member.userId === user.id;
              // Degradering av den sista ägaren vägras av guard_last_owner, så
              // vi döljer knappen i stället för att be om ett säkert fel.
              const wouldOrphan = member.role === "owner" && owners === 1;

              return (
                <Surface key={member.userId} className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Typography.Heading type="h5">
                        {member.displayName}
                        {isMe ? " (du)" : ""}
                      </Typography.Heading>
                    </View>
                    <Chip size="sm">
                      <Chip.Label>{ROLE_LABELS[member.role]}</Chip.Label>
                    </Chip>
                  </View>

                  {isOwner && (!wouldOrphan || !isMe) && (
                    <View className="flex-row gap-2">
                      {!wouldOrphan && (
                        <Button
                          variant="tertiary"
                          className="flex-1 rounded-xl bg-field"
                          isDisabled={setRole.isPending}
                          onPress={() => changeRole(member)}
                        >
                          <Typography.Paragraph type="body-sm">
                            {member.role === "owner"
                              ? "Gör till medlem"
                              : "Gör till ägare"}
                          </Typography.Paragraph>
                        </Button>
                      )}
                      {/* Sig själv lämnar man via "Lämna hemmet", som har
                          rätt grenar för sista medlemmen. */}
                      {!isMe && (
                        <Button
                          variant="tertiary"
                          className="flex-1 rounded-xl bg-danger-soft"
                          isDisabled={removeMember.isPending}
                          onPress={() => confirmRemove(member)}
                        >
                          <Typography.Paragraph
                            type="body-sm"
                            className="text-danger"
                          >
                            Ta bort
                          </Typography.Paragraph>
                        </Button>
                      )}
                    </View>
                  )}
                </Surface>
              );
            })}
          </View>

          <FieldError isInvalid={!!setRole.error}>
            {errorText(setRole.error, "Kunde inte ändra rollen")}
          </FieldError>
          <FieldError isInvalid={!!removeMember.error}>
            {errorText(removeMember.error, "Kunde inte ta bort medlemmen")}
          </FieldError>
        </View>

        <Separator />

        {/* ---- Lämna ---- */}
        <View className="gap-2">
          <Label>Lämna hemmet</Label>
          <Typography.Paragraph type="body-sm" color="muted">
            {members.data?.length === 1
              ? "Du är ensam medlem, så hemmet raderas när du lämnar det."
              : "Hemmets recept och veckoplan blir kvar hos de andra."}
          </Typography.Paragraph>
          <FieldError isInvalid={!!leave.error}>
            {errorText(leave.error, "Kunde inte lämna hemmet")}
          </FieldError>
          <Button
            variant="tertiary"
            className="rounded-2xl bg-danger-soft"
            isDisabled={leave.isPending}
            onPress={confirmLeave}
          >
            <StyledIonicons
              name="exit-outline"
              size={20}
              className="text-danger"
            />
            <Typography.Paragraph className="text-danger">
              {leave.isPending ? "Lämnar…" : "Lämna hemmet"}
            </Typography.Paragraph>
          </Button>
        </View>

        {/* ---- Radera ----
            Bara när man är ensam medlem. delete_home vägrar annars, och skälet
            är att inget tappas: lämnar den sista medlemmen raderas hemmet av
            leave_home automatiskt. Med folk kvar hade raderingen bara varit ett
            sätt att ta andras data. */}
        {isOwner && isAlone && (
          <View className="gap-2">
            <Label>Radera hemmet</Label>
            {!showDelete ? (
              <Button
                variant="tertiary"
                className="rounded-2xl"
                onPress={() => setShowDelete(true)}
              >
                <Typography.Paragraph color="muted">
                  Radera hemmet permanent
                </Typography.Paragraph>
              </Button>
            ) : (
              <View className="gap-2">
                <Typography.Paragraph type="body-sm" color="muted">
                  Recept, veckoplan, inköpslistor och egna ingredienser raderas
                  för alla medlemmar. Det går inte att ångra. Skriv{" "}
                  <Typography.Paragraph type="body-sm" weight="bold">
                    {home.name}
                  </Typography.Paragraph>{" "}
                  för att bekräfta.
                </Typography.Paragraph>
                <TextField isInvalid={!!remove.error}>
                  <Input
                    value={confirmName}
                    onChangeText={setConfirmName}
                    autoCapitalize="none"
                    placeholder={home.name}
                  />
                  <FieldError>
                    {errorText(remove.error, "Kunde inte radera hemmet")}
                  </FieldError>
                </TextField>
                <View className="flex-row gap-2">
                  <Button
                    variant="tertiary"
                    className="flex-1 rounded-2xl bg-field"
                    onPress={() => {
                      setShowDelete(false);
                      setConfirmName("");
                      remove.reset();
                    }}
                  >
                    <Typography.Paragraph>Avbryt</Typography.Paragraph>
                  </Button>
                  <Button
                    variant="tertiary"
                    className="flex-1 rounded-2xl bg-danger-soft"
                    isDisabled={
                      remove.isPending || confirmName.trim() !== home.name
                    }
                    onPress={() => remove.mutate(home.id)}
                  >
                    <Typography.Paragraph className="text-danger">
                      {remove.isPending ? "Raderar…" : "Radera"}
                    </Typography.Paragraph>
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ManageHome;
