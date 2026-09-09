import React, { useState, useMemo, useRef } from "react";
import { Home, ListChecks, Heart, Plus, MessageCircle, Wallet, ChevronLeft, X, Check, Pencil, Trash2, SlidersHorizontal, UserPlus, Receipt, CalendarClock, Bookmark } from "lucide-react";

const FRIENDS = [
  { id: "u2", name: "Marta López", initials: "ML", color: "#0E6E64" },
  { id: "u3", name: "Julián Ruiz", initials: "JR", color: "#C9A15A" },
  { id: "u4", name: "Laura Ibáñez", initials: "LI", color: "#FF5A3C" },
  { id: "u5", name: "Diego Costa", initials: "DC", color: "#6B5CA5" },
];
const TAKEN_USERNAMES = ["ana.garcia", "martalopez", "julian_r"];

const seedPlans = [
  {
    id: "p1",
    title: "Finde en Sintra",
    type: "Viaje",
    start: "2026-09-06",
    end: "2026-09-08",
    time: null,
    location: "Sintra, Portugal",
    itineraryEnabled: true,
    expensesEnabled: true,
    guestListVisibility: "public_full",
    ownerId: "me",
    visibility: "privada",
    joinRequests: [{ id: "req1", name: "Pedro Álvarez" }],
    participants: [
      { userId: "me", name: "Ana García", rsvp: "yes", show: true },
      { userId: "u2", name: "Marta López", rsvp: "yes", show: true },
      { userId: "u3", name: "Julián Ruiz", rsvp: "yes", show: true },
      { userId: "u4", name: "Laura Ibáñez", rsvp: "pending", show: true },
      { userId: null, name: "Carla Mendes", rsvp: "yes", show: true, guestName: "Carla Mendes" },
    ],
    expenses: [
      { id: "e1", desc: "Airbnb", paidBy: "Marta López", amount: 120, splitWith: ["Ana García", "Marta López", "Julián Ruiz"] },
      { id: "e2", desc: "Gasolina", paidBy: "Julián Ruiz", amount: 40, splitWith: ["Ana García", "Julián Ruiz"] },
      { id: "e3", desc: "Cena viernes", paidBy: "Ana García", amount: 65, splitWith: ["Ana García", "Marta López", "Julián Ruiz"] },
    ],
    messages: [
      { from: "Marta López", text: "¿Reservamos el airbnb ya?" },
      { from: "Ana García", text: "Sí, lo miro hoy" },
    ],
    lists: [
      {
        id: "l1",
        title: "Qué llevar",
        items: [
          { id: "i1", text: "Protector solar", done: true },
          { id: "i2", text: "Cargador", done: false },
          { id: "i3", text: "Bañador", done: false },
        ],
      },
    ],
    tripPlan: {
      importantInfo: [
        { id: "info1", title: "Vuelo de ida", content: "TAP TP1234 · 06 sep, 09:15 · Localizador ABCDEF" },
        { id: "info2", title: "Seguro de viaje", content: "Mapfre Asistencia · Tel. +34 900 123 456" },
      ],
      accommodation: [
        {
          id: "acc1",
          name: "Casa da Encosta",
          address: "Rua das Flores 12, Sintra",
          checkIn: "2026-09-06",
          checkOut: "2026-09-08",
          notes: "Código de acceso: 4521. Contacto anfitriona: Inês, +351 912 345 678.",
        },
      ],
      days: [
        {
          date: "2026-09-06",
          activities: [
            { id: "a1", time: "10:00", title: "Llegada y check-in", location: "Casa da Encosta", notes: "" },
            { id: "a2", time: "17:00", title: "Paseo por el centro histórico", location: "Centro de Sintra", notes: "" },
          ],
        },
        {
          date: "2026-09-07",
          activities: [
            { id: "a3", time: "09:30", title: "Palacio da Pena", location: "Pena Palace", notes: "Comprar entrada online para evitar colas" },
            { id: "a4", time: "14:00", title: "Comida", location: "Tascantiga", notes: "" },
          ],
        },
        {
          date: "2026-09-08",
          activities: [{ id: "a5", time: "11:00", title: "Check-out y vuelta", location: "Casa da Encosta", notes: "" }],
        },
      ],
    },
  },
  {
    id: "p2",
    title: "Cena Marta",
    type: "Comida",
    start: "2026-08-28",
    end: null,
    time: "21:00",
    location: "Restaurante Casa Rufo",
    expensesEnabled: false,
    guestListVisibility: "public_count",
    ownerId: "me",
    visibility: "publica",
    joinRequests: [],
    participants: [
      { userId: "me", name: "Ana García", rsvp: "yes", show: true },
      { userId: "u2", name: "Marta López", rsvp: "yes", show: true },
      { userId: "u5", name: "Diego Costa", rsvp: "pending", show: true },
    ],
    expenses: [],
    messages: [],
    lists: [],
  },
  {
    id: "p3",
    title: "Cumple Diego",
    type: "Evento",
    start: "2026-08-29",
    end: null,
    time: "20:30",
    location: "Terraza Malasaña",
    expensesEnabled: true,
    guestListVisibility: "hidden",
    ownerId: "me",
    visibility: "privada",
    joinRequests: [],
    participants: [
      { userId: "me", name: "Ana García", rsvp: "yes", show: true },
      { userId: "u3", name: "Julián Ruiz", rsvp: "yes", show: true },
      { userId: "u4", name: "Laura Ibáñez", rsvp: "yes", show: true },
      { userId: "u5", name: "Diego Costa", rsvp: "yes", show: true },
    ],
    expenses: [{ id: "e4", desc: "Regalo grupal", paidBy: "Ana García", amount: 30, splitWith: ["Ana García", "Julián Ruiz", "Laura Ibáñez"] }],
    messages: [],
    lists: [],
  },
  {
    id: "p4",
    title: "Cumpleaños de Marta",
    type: "Evento",
    start: "2026-09-12",
    end: null,
    time: "19:30",
    location: "Terraza Chueca",
    itineraryEnabled: false,
    expensesEnabled: true,
    guestListVisibility: "public_full",
    ownerId: "u2",
    visibility: "publica",
    joinRequests: [],
    participants: [
      { userId: "u2", name: "Marta López", rsvp: "yes", show: true },
      { userId: "me", name: "Ana García", rsvp: "pending", show: true },
      { userId: "u3", name: "Julián Ruiz", rsvp: "yes", show: true },
      { userId: "u4", name: "Laura Ibáñez", rsvp: "maybe", show: true },
    ],
    expenses: [{ id: "e5", desc: "Tarta y globos", paidBy: "Marta López", amount: 45, splitWith: ["Marta López", "Julián Ruiz"] }],
    messages: [{ from: "Marta López", text: "¡Espero que podáis venir! Avisadme si hay alergias para la tarta 🎂" }],
    lists: [],
  },
];

// Estilos compartidos (evitan repetir el mismo objeto inline decenas de veces)
const sectionLabel = { fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };
const sectionLabelSm = { fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 };
const sectionLabelBare = { fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1 };
const whiteCard = { background: "#fff", borderRadius: 10 };

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function friendMeta(name) {
  return FRIENDS.find((f) => f.name === name);
}

const TYPE_COLOR = {
  Viaje: "#0E6E64",
  Comida: "#C9A15A",
  Evento: "#FF5A3C",
  "Plan casual": "#6B5CA5",
};
const PLAN_TYPES = Object.keys(TYPE_COLOR);

function Stamp({ status }) {
  const map = {
    yes: { text: "CONFIRMADO", color: "#0E6E64" },
    pending: { text: "PENDIENTE", color: "#C9A15A" },
    maybe: { text: "PENDIENTE", color: "#C9A15A" },
    no: { text: "NO VA", color: "#8a8a8a" },
  };
  const s = map[status] || map.pending;
  return (
    <div
      style={{
        border: `2px solid ${s.color}`,
        color: s.color,
        transform: "rotate(-8deg)",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1,
        padding: "3px 8px",
        borderRadius: 3,
        whiteSpace: "nowrap",
      }}
    >
      {s.text}
    </div>
  );
}

function TicketCard({ plan, onClick }) {
  const confirmed = plan.participants.filter((p) => p.rsvp === "yes");
  const myRsvp = plan.participants.find((p) => p.userId === "me")?.rsvp || "pending";
  const dateStr = new Date(plan.start + "T00:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  }).replace(" de ", " ");
  const endStr = plan.end
    ? new Date(plan.end + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ")
    : null;
  const dateLabel = endStr ? `${dateStr} – ${endStr}` : plan.time ? `${dateStr} · ${plan.time}` : dateStr;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        background: "#FFFFFF",
        border: "1px solid #E6E6E3",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        marginBottom: 12,
        boxShadow: "0 1px 3px rgba(22,27,46,0.06)",
      }}
    >
      <div
        style={{
          width: 64,
          background: TYPE_COLOR[plan.type] || "#161B2E",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: 1,
          padding: "10px 0",
          position: "relative",
        }}
      >
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 700 }}>
          {plan.type.toUpperCase()}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: "12px 14px",
          borderLeft: "2px dashed #DCDCD8",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "#161B2E" }}>
              {plan.title}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C8C88", marginTop: 2 }}>
              {dateLabel.toUpperCase()} · {plan.location}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <Stamp status={myRsvp} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex" }}>
                {confirmed.slice(0, 4).map((p, i) => {
                  const f = friendMeta(p.name);
                  const initials = p.name === "Ana García" ? "AG" : f?.initials || getInitials(p.name);
                  return (
                    <div
                      key={i}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: p.userId ? (p.name === "Ana García" ? "#161B2E" : f?.color || "#999") : "#fff",
                        border: p.userId ? "2px solid #fff" : "2px dashed #C7C7C2",
                        color: p.userId ? "#fff" : "#8C8C88",
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: i === 0 ? 0 : -7,
                      }}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
              <span style={{ fontSize: 10, color: "#8C8C88", whiteSpace: "nowrap" }}>
                {plan.guestListVisibility === "hidden" ? "Privada" : `${confirmed.length}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanDetail({ plan, onBack, onUpdate, onEdit, onDelete, initialTab, templates, onSaveTemplate, onDeleteTemplate, onNotifyPayment }) {
  const [tab, setTab] = useState(initialTab || "detalles");
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("Ana García");
  const [splitWith, setSplitWith] = useState(
    plan.participants.filter((p) => p.rsvp === "yes").map((p) => p.name)
  );
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState(null);

  const confirmed = plan.participants.filter((p) => p.rsvp === "yes");
  const myRsvp = plan.participants.find((p) => p.userId === "me")?.rsvp;
  const [rsvpPromptOpen, setRsvpPromptOpen] = useState(!myRsvp || myRsvp === "pending");
  const [showGuestList, setShowGuestList] = useState(false);
  const [planLinkCopied, setPlanLinkCopied] = useState(false);
  const planInviteLink = useMemo(() => `cantixplora.app/invite/${plan.id}-${Math.random().toString(36).slice(2, 7)}`, [plan.id]);
  const [confirmRemoveParticipant, setConfirmRemoveParticipant] = useState(null);
  const isOwner = plan.ownerId === "me";

  function removeParticipant(participant) {
    onUpdate({ ...plan, participants: plan.participants.filter((p) => p !== participant) });
    setConfirmRemoveParticipant(null);
  }
  function approveRequest(reqId) {
    const req = (plan.joinRequests || []).find((r) => r.id === reqId);
    if (!req) return;
    onUpdate({
      ...plan,
      joinRequests: plan.joinRequests.filter((r) => r.id !== reqId),
      participants: [...plan.participants, { userId: null, name: req.name, rsvp: "pending", show: true, guestName: req.name }],
    });
  }
  function rejectRequest(reqId) {
    onUpdate({ ...plan, joinRequests: (plan.joinRequests || []).filter((r) => r.id !== reqId) });
  }

  function toggleSplit(name) {
    setSplitWith((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  // Balance por persona: lo que ha pagado, menos su parte en cada gasto donde está incluida
  const balances = useMemo(() => {
    const net = {};
    confirmed.forEach((p) => (net[p.name] = 0));
    plan.expenses.forEach((e) => {
      const participants = e.splitWith && e.splitWith.length ? e.splitWith : confirmed.map((p) => p.name);
      const share = e.amount / participants.length;
      net[e.paidBy] = (net[e.paidBy] || 0) + e.amount;
      participants.forEach((name) => {
        net[name] = (net[name] || 0) - share;
      });
    });
    return Object.entries(net).map(([name, val]) => ({ name, net: +val.toFixed(2) }));
  }, [plan.expenses, confirmed]);

  const myNet = balances.find((b) => b.name === "Ana García")?.net || 0;

  // Reparto de deudas simplificado: mínimo número de transferencias para saldar todo
  const settlementPlan = useMemo(() => {
    const debtors = balances.filter((b) => b.net < -0.01).map((b) => ({ ...b })).sort((a, b) => a.net - b.net);
    const creditors = balances.filter((b) => b.net > 0.01).map((b) => ({ ...b })).sort((a, b) => b.net - a.net);
    const transfers = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(-debtors[i].net, creditors[j].net);
      if (amount > 0.01) {
        transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: +amount.toFixed(2) });
      }
      debtors[i].net += amount;
      creditors[j].net -= amount;
      if (Math.abs(debtors[i].net) < 0.01) i++;
      if (Math.abs(creditors[j].net) < 0.01) j++;
    }
    return transfers;
  }, [balances]);

  function setRsvp(status) {
    const updated = {
      ...plan,
      participants: plan.participants.map((p) => (p.userId === "me" ? { ...p, rsvp: status } : p)),
    };
    onUpdate(updated);
    setRsvpPromptOpen(false);
  }

  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  function handleRsvpChoice(status) {
    if (status === "no") {
      setShowDeclineConfirm(true);
      return;
    }
    setRsvp(status);
  }

  function confirmDecline() {
    setShowDeclineConfirm(false);
    setRsvp("no");
    onBack();
  }

  function reconsiderDecline() {
    setShowDeclineConfirm(false);
    setRsvp("maybe");
  }

  function sendMessage() {
    if (!msg.trim()) return;
    onUpdate({ ...plan, messages: [...plan.messages, { from: "Ana García", text: msg }] });
    setMsg("");
  }

  function resetExpenseForm() {
    setExpenseDesc("");
    setExpenseAmount("");
    setExpensePaidBy("Ana García");
    setSplitWith(confirmed.map((p) => p.name));
    setEditingExpenseId(null);
  }

  function startEditExpense(e) {
    setEditingExpenseId(e.id);
    setExpenseDesc(e.desc);
    setExpenseAmount(String(e.amount));
    setExpensePaidBy(e.paidBy);
    setSplitWith(e.splitWith && e.splitWith.length ? e.splitWith : confirmed.map((p) => p.name));
  }

  function saveExpense() {
    if (!expenseDesc.trim() || !expenseAmount || splitWith.length === 0) return;
    if (editingExpenseId) {
      onUpdate({
        ...plan,
        expenses: plan.expenses.map((e) =>
          e.id === editingExpenseId
            ? { ...e, desc: expenseDesc, paidBy: expensePaidBy, amount: parseFloat(expenseAmount), splitWith }
            : e
        ),
      });
    } else {
      onUpdate({
        ...plan,
        expenses: [
          ...plan.expenses,
          { id: "e" + Date.now(), desc: expenseDesc, paidBy: expensePaidBy, amount: parseFloat(expenseAmount), splitWith },
        ],
      });
    }
    resetExpenseForm();
  }

  function deleteExpense(id) {
    onUpdate({ ...plan, expenses: plan.expenses.filter((e) => e.id !== id) });
    setConfirmDeleteExpenseId(null);
    if (editingExpenseId === id) resetExpenseForm();
  }

  function toggleAccountsClosed() {
    onUpdate({ ...plan, accountsClosed: !plan.accountsClosed });
  }

  function togglePaidTransfer(key, transfer) {
    const current = plan.paidTransfers || [];
    const willBePaid = !current.includes(key);
    onUpdate({
      ...plan,
      paidTransfers: willBePaid ? [...current, key] : current.filter((k) => k !== key),
    });
    if (willBePaid) {
      onNotifyPayment({ planTitle: plan.title, from: transfer.from, to: transfer.to, amount: transfer.amount });
    }
  }

  // --- Listas ---
  const [newListTitle, setNewListTitle] = useState("");
  const [newItemText, setNewItemText] = useState({});
  const [confirmDeleteListId, setConfirmDeleteListId] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  function addList() {
    if (!newListTitle.trim()) return;
    onUpdate({
      ...plan,
      lists: [...(plan.lists || []), { id: "l" + Date.now(), title: newListTitle, items: [] }],
    });
    setNewListTitle("");
  }

  function addListFromTemplate(template) {
    onUpdate({
      ...plan,
      lists: [
        ...(plan.lists || []),
        {
          id: "l" + Date.now(),
          title: template.title,
          items: template.items.map((text, i) => ({ id: "i" + Date.now() + i, text, done: false })),
          templateId: template.id,
        },
      ],
    });
    setShowTemplatePicker(false);
  }

  function toggleListTemplate(list) {
    if (list.templateId) {
      // Ya está guardada: desactivar = eliminarla de plantillas guardadas
      onDeleteTemplate(list.templateId);
      onUpdate({ ...plan, lists: plan.lists.map((l) => (l.id === list.id ? { ...l, templateId: null } : l)) });
    } else {
      const newTemplateId = "t" + Date.now();
      onSaveTemplate({ id: newTemplateId, title: list.title, items: list.items.map((it) => it.text) });
      onUpdate({ ...plan, lists: plan.lists.map((l) => (l.id === list.id ? { ...l, templateId: newTemplateId } : l)) });
    }
  }

  function deleteList(listId) {
    onUpdate({ ...plan, lists: plan.lists.filter((l) => l.id !== listId) });
    setConfirmDeleteListId(null);
  }

  function addItem(listId) {
    const text = (newItemText[listId] || "").trim();
    if (!text) return;
    onUpdate({
      ...plan,
      lists: plan.lists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, { id: "i" + Date.now(), text, done: false }] } : l
      ),
    });
    setNewItemText((prev) => ({ ...prev, [listId]: "" }));
  }

  function toggleItem(listId, itemId) {
    onUpdate({
      ...plan,
      lists: plan.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
          : l
      ),
    });
  }

  function deleteItem(listId, itemId) {
    onUpdate({
      ...plan,
      lists: plan.lists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((it) => it.id !== itemId) } : l)),
    });
  }

  // --- El Plan (itinerario de viaje) ---
  function generateDays(start, end) {
    if (!start) return [];
    const days = [];
    let d = new Date(start + "T00:00:00");
    const endD = new Date((end || start) + "T00:00:00");
    while (d <= endD) {
      days.push({ date: d.toISOString().split("T")[0], activities: [] });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }
  const tripPlan = plan.tripPlan || { importantInfo: [], accommodation: [], days: generateDays(plan.start, plan.end) };
  const [newInfoTitle, setNewInfoTitle] = useState("");
  const [newInfoContent, setNewInfoContent] = useState("");
  const [showAccForm, setShowAccForm] = useState(false);
  const [accDraft, setAccDraft] = useState({ name: "", address: "", checkIn: "", checkOut: "", notes: "" });
  const [newActivity, setNewActivity] = useState({});
  const [openDay, setOpenDay] = useState(tripPlan.days[0]?.date || null);

  function updateTripPlan(patch) {
    onUpdate({ ...plan, tripPlan: { ...tripPlan, ...patch } });
  }

  function addInfo() {
    if (!newInfoTitle.trim()) return;
    updateTripPlan({
      importantInfo: [...tripPlan.importantInfo, { id: "info" + Date.now(), title: newInfoTitle, content: newInfoContent }],
    });
    setNewInfoTitle("");
    setNewInfoContent("");
  }

  function deleteInfo(id) {
    updateTripPlan({ importantInfo: tripPlan.importantInfo.filter((i) => i.id !== id) });
  }

  function saveAccommodation() {
    if (!accDraft.name.trim()) return;
    updateTripPlan({ accommodation: [...tripPlan.accommodation, { id: "acc" + Date.now(), ...accDraft }] });
    setAccDraft({ name: "", address: "", checkIn: "", checkOut: "", notes: "" });
    setShowAccForm(false);
  }

  function deleteAccommodation(id) {
    updateTripPlan({ accommodation: tripPlan.accommodation.filter((a) => a.id !== id) });
  }

  function addActivity(date) {
    const draft = newActivity[date];
    if (!draft || !draft.title?.trim()) return;
    updateTripPlan({
      days: tripPlan.days.map((d) =>
        d.date === date
          ? {
              ...d,
              activities: [...d.activities, { id: "a" + Date.now(), time: draft.time || "00:00", title: draft.title, location: draft.location || "", notes: draft.notes || "" }].sort(
                (a, b) => a.time.localeCompare(b.time)
              ),
            }
          : d
      ),
    });
    setNewActivity((prev) => ({ ...prev, [date]: { time: "", title: "", location: "", notes: "" } }));
  }

  function deleteActivity(date, id) {
    updateTripPlan({
      days: tripPlan.days.map((d) => (d.date === date ? { ...d, activities: d.activities.filter((a) => a.id !== id) } : d)),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          background: TYPE_COLOR[plan.type] || "#161B2E",
          color: "#fff",
          padding: "14px 16px 20px",
          position: "relative",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0, marginBottom: 10 }}
        >
          <ChevronLeft size={18} /> <span style={{ fontSize: 13 }}>Planes</span>
        </button>
        <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 8 }}>
          <button
            onClick={() => onEdit(plan)}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Pencil size={15} color="#fff" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Trash2 size={15} color="#fff" />
          </button>
        </div>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 22, fontWeight: 600 }}>{plan.title}</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.85, marginTop: 4, marginBottom: 10 }}>
          {plan.location} · {new Date(plan.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}
          {plan.end ? ` – ${new Date(plan.end + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}` : ""}
          {plan.time ? ` · ${plan.time}` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            onClick={() => setRsvpPromptOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 20,
              padding: "5px 10px 5px 12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>
              {{ yes: "CONFIRMADO", maybe: "TAL VEZ", no: "NO VAS", pending: "¿VAS A IR?" }[myRsvp || "pending"]}
            </span>
            <Pencil size={11} color="#fff" style={{ opacity: 0.8 }} />
          </div>

          {plan.guestListVisibility !== "hidden" && (
            <div
              onClick={() => setShowGuestList(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", position: "relative" }}
            >
              {isOwner && plan.visibility === "privada" && (plan.joinRequests || []).length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    background: "#C9A15A",
                    color: "#fff",
                    borderRadius: "50%",
                    minWidth: 14,
                    height: 14,
                    fontSize: 8.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1.5px solid " + (TYPE_COLOR[plan.type] || "#161B2E"),
                    padding: "0 2px",
                    zIndex: 1,
                  }}
                >
                  {plan.joinRequests.length}
                </div>
              )}
              <div style={{ display: "flex" }}>
                {confirmed.slice(0, 4).map((p, i) => {
                  const isGuest = !p.userId;
                  const friend = friendMeta(p.name);
                  const initials = isGuest ? "?" : p.name === "Ana García" ? "AG" : friend?.initials || getInitials(p.name);
                  return (
                    <div
                      key={i}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: isGuest ? "rgba(255,255,255,0.15)" : p.name === "Ana García" ? "#fff" : friend?.color || "#999",
                        border: isGuest ? "1.5px dashed rgba(255,255,255,0.6)" : "2px solid " + (TYPE_COLOR[plan.type] || "#161B2E"),
                        color: isGuest ? "#fff" : p.name === "Ana García" ? "#161B2E" : "#fff",
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: i === 0 ? 0 : -7,
                      }}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: "#fff", opacity: 0.85 }}>{confirmed.length}</span>
            </div>
          )}
        </div>
      </div>

      {showGuestList && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={() => setShowGuestList(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "75%", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600 }}>
                Confirmados ({confirmed.length})
              </div>
              <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => setShowGuestList(false)} />
            </div>

            {isOwner && (
              <div style={{ ...whiteCard, border: "1px solid #E6E6E3", padding: 14, marginBottom: 16 }}>
                <div style={sectionLabelSm}>Invitar a más gente</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#F0F0EE",
                    border: "1px solid #DCDCD8",
                    borderRadius: 8,
                    padding: "9px 11px",
                  }}
                >
                  <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#161B2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {planInviteLink}
                  </span>
                  <button
                    onClick={() => {
                      setPlanLinkCopied(true);
                      setTimeout(() => setPlanLinkCopied(false), 1500);
                    }}
                    style={{
                      background: planLinkCopied ? "#0E6E64" : "#161B2E",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {planLinkCopied ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {isOwner && plan.visibility === "privada" && (plan.joinRequests || []).length > 0 && (
              <>
                <div style={{ ...sectionLabelSm, color: "#C9A15A" }}>
                  Solicitudes pendientes ({plan.joinRequests.length})
                </div>
                <div style={{ background: "#FBF3E7", borderRadius: 10, padding: "4px 14px", marginBottom: 16 }}>
                  {plan.joinRequests.map((r, i) => (
                    <div
                      key={r.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < plan.joinRequests.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                    >
                      <span style={{ fontSize: 13 }}>{r.name}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => rejectRequest(r.id)}
                          style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                          <X size={13} color="#8C8C88" />
                        </button>
                        <button
                          onClick={() => approveRequest(r.id)}
                          style={{ width: 26, height: 26, borderRadius: "50%", background: "#161B2E", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                          <Check size={13} color="#fff" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {confirmed.map((p, i) => {
              const isGuest = !p.userId;
              const friend = friendMeta(p.name);
              const isPlanOwner = p.userId === plan.ownerId;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: i < confirmed.length - 1 ? "1px solid #FAFAF8" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: isGuest ? "#fff" : p.name === "Ana García" ? "#161B2E" : friend?.color || "#999",
                        border: isGuest ? "1.5px dashed #C7C7C2" : "none",
                        color: isGuest ? "#8C8C88" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {isGuest ? "?" : p.name === "Ana García" ? "AG" : friend?.initials}
                    </div>
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                    {isPlanOwner && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#0E6E64", background: "#E8F3F1", padding: "2px 7px", borderRadius: 10 }}>
                        ORGANIZADOR
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isGuest && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#6B6B67", background: "#EDEDEA", padding: "2px 7px", borderRadius: 10 }}>
                        SIN CUENTA
                      </span>
                    )}
                    {isOwner && !isPlanOwner && (
                      <div
                        onClick={() => setConfirmRemoveParticipant(p)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#FBEAE6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} color="#FF5A3C" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {confirmed.some((p) => !p.userId) && (
              <div style={{ fontSize: 11, color: "#8C8C88", marginTop: 10, lineHeight: 1.4 }}>
                Los invitados "sin cuenta" se unieron por enlace. Si crean una cuenta con el mismo email o teléfono, se enlazarán automáticamente a este plan y su historial.
              </div>
            )}
          </div>
        </div>
      )}

      {(!myRsvp || myRsvp === "pending") && rsvpPromptOpen ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "#FAFAF8" }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            ¿Vas a ir?
          </div>
          <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 18, maxWidth: 220 }}>
            Dinos si asistirás a "{plan.title}".
          </div>

          <div style={{ ...whiteCard, padding: 14, width: "100%", maxWidth: 240, marginBottom: 18, textAlign: "left" }}>
            <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Vista rápida</div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <b>Lugar:</b> {plan.location || "Por definir"}
            </div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <b>Fecha:</b> {new Date(plan.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}
              {plan.end ? ` – ${new Date(plan.end + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}` : ""}
              {plan.time ? ` · ${plan.time}` : ""}
            </div>
            <div style={{ fontSize: 12 }}>
              <b>Organiza:</b> {plan.participants.find((p) => p.userId === plan.ownerId)?.name || "—"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 240 }}>
            {[
              { key: "yes", label: "Voy" },
              { key: "maybe", label: "Tal vez" },
              { key: "no", label: "No voy" },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => handleRsvpChoice(o.key)}
                style={{
                  padding: "13px 0",
                  borderRadius: 8,
                  border: o.key === "yes" ? "none" : "1px solid #DCDCD8",
                  background: o.key === "yes" ? "#161B2E" : "#fff",
                  color: o.key === "yes" ? "#fff" : "#161B2E",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            ))}
            <div onClick={() => setRsvpPromptOpen(false)} style={{ fontSize: 12, color: "#8C8C88", cursor: "pointer", padding: "4px 0" }}>
              Ver más tarde, solo estoy mirando
            </div>
          </div>
        </div>
      ) : myRsvp === "no" && !rsvpPromptOpen ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "#FAFAF8" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>👋</div>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Has indicado que no vas
          </div>
          <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 22, maxWidth: 220 }}>
            No verás el chat ni los gastos de "{plan.title}" mientras mantengas esta respuesta.
          </div>
          <button onClick={() => setRsvpPromptOpen(true)} style={{ ...btnSecondary, width: 200 }}>
            Cambiar mi respuesta
          </button>
        </div>
      ) : (
        <>
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #E6E6E3" }}>
        {[
          { key: "chat", label: "Chat" },
          { key: "listas", label: "Listas" },
          ...(plan.itineraryEnabled ? [{ key: "elplan", label: "El Plan" }] : []),
          ...(plan.expensesEnabled ? [{ key: "gastos", label: "Gastos" }] : []),
          { key: "detalles", label: "Detalles" },
        ].map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              fontSize: 12,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#161B2E" : "#8C8C88",
              borderBottom: tab === t.key ? "2px solid #FF5A3C" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#FAFAF8" }}>
        {tab === "detalles" && (
          <>
            <div style={sectionLabelSm}>Información del plan</div>
            <div style={whiteCard}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #FAFAF8" }}>
                <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{plan.type}</div>
              </div>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #FAFAF8" }}>
                <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 0.5 }}>Lugar</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{plan.location || "Por definir"}</div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 0.5 }}>Fecha</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {new Date(plan.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}
                  {plan.end ? ` – ${new Date(plan.end + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}` : ""}
                  {plan.time ? ` · ${plan.time}` : ""}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#8C8C88", marginTop: 10 }}>
              Toca los avatares junto a tu respuesta, arriba, para ver quién más confirmó.
            </div>
          </>
        )}

        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1 }}>
              {plan.messages.length === 0 && (
                <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", marginTop: 30 }}>
                  Aún no hay mensajes. Escribe el primero.
                </div>
              )}
              {plan.messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.from === "Ana García" ? "flex-end" : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      background: m.from === "Ana García" ? "#161B2E" : "#fff",
                      color: m.from === "Ana García" ? "#fff" : "#161B2E",
                      borderRadius: 12,
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    {m.from !== "Ana García" && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#0E6E64", marginBottom: 2 }}>{m.from}</div>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Escribe un mensaje..."
                style={{ flex: 1, padding: "10px 12px", borderRadius: 20, border: "1px solid #DCDCD8", fontSize: 12 }}
              />
              <button
                onClick={sendMessage}
                style={{ background: "#FF5A3C", color: "#fff", border: "none", borderRadius: 20, padding: "0 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        {tab === "listas" && (
          <>
            {(plan.lists || []).length === 0 && (
              <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", marginTop: 20, marginBottom: 16 }}>
                Aún no hay listas. Crea una para organizar qué llevar, comprar o hacer.
              </div>
            )}
            {(plan.lists || []).map((list) => {
              const doneCount = list.items.filter((it) => it.done).length;
              return (
                <div key={list.id} style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{list.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, color: "#8C8C88" }}>{doneCount}/{list.items.length}</span>
                      <Bookmark
                        size={14}
                        color="#0E6E64"
                        fill={list.templateId ? "#0E6E64" : "none"}
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleListTemplate(list)}
                      />
                      <Trash2 size={14} color="#FF5A3C" style={{ cursor: "pointer" }} onClick={() => setConfirmDeleteListId(list.id)} />
                    </div>
                  </div>

                  {list.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #FAFAF8" }}>
                      <div onClick={() => toggleItem(list.id, it.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: it.done ? "none" : "1px solid #DCDCD8",
                            background: it.done ? "#0E6E64" : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {it.done && <Check size={11} color="#fff" />}
                        </div>
                        <span style={{ fontSize: 12, textDecoration: it.done ? "line-through" : "none", color: it.done ? "#8C8C88" : "#161B2E" }}>
                          {it.text}
                        </span>
                      </div>
                      <X size={13} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => deleteItem(list.id, it.id)} />
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      placeholder="Añadir elemento..."
                      value={newItemText[list.id] || ""}
                      onChange={(e) => setNewItemText((prev) => ({ ...prev, [list.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                      style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
                    />
                    <button
                      onClick={() => addItem(list.id)}
                      style={{ background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ background: "#fff", borderRadius: 10, padding: 14 }}>
              <div style={sectionLabel}>
                Nueva lista
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: templates && templates.length > 0 ? 10 : 0 }}>
                <input
                  placeholder="Ej: Lista de la compra"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addList()}
                  style={{ flex: 1, padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
                />
                <button
                  onClick={addList}
                  style={{ background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Crear
                </button>
              </div>

              {templates && templates.length > 0 && (
                <div
                  onClick={() => setShowTemplatePicker((v) => !v)}
                  style={{ fontSize: 11, color: "#161B2E", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Bookmark size={12} color="#0E6E64" />
                  O usa una plantilla guardada ({templates.length})
                </div>
              )}
              {showTemplatePicker && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #E6E6E3",
                      }}
                    >
                      <div onClick={() => addListFromTemplate(t)} style={{ flex: 1, cursor: "pointer" }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</span>
                        <span style={{ fontSize: 10, color: "#8C8C88", marginLeft: 8 }}>{t.items.length} elementos</span>
                      </div>
                      <X
                        size={14}
                        color="#8C8C88"
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        onClick={() => {
                          onDeleteTemplate(t.id);
                          onUpdate({
                            ...plan,
                            lists: (plan.lists || []).map((l) => (l.templateId === t.id ? { ...l, templateId: null } : l)),
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "elplan" && (
          <>
            <div style={sectionLabel}>
              Información importante
            </div>
            {tripPlan.importantInfo.map((info) => (
              <div key={info.id} style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{info.title}</div>
                  <div style={{ fontSize: 11, color: "#5A5A56", marginTop: 3 }}>{info.content}</div>
                </div>
                <X size={13} color="#8C8C88" style={{ cursor: "pointer", flexShrink: 0, marginTop: 2 }} onClick={() => deleteInfo(info.id)} />
              </div>
            ))}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 20 }}>
              <input
                placeholder="Título (ej: Vuelo de vuelta)"
                value={newInfoTitle}
                onChange={(e) => setNewInfoTitle(e.target.value)}
                style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }}
              />
              <input
                placeholder="Detalle"
                value={newInfoContent}
                onChange={(e) => setNewInfoContent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInfo()}
                style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
              />
              <button onClick={addInfo} style={{ width: "100%", background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                + Añadir nota
              </button>
            </div>

            <div style={sectionLabel}>
              Alojamiento
            </div>
            {tripPlan.accommodation.map((acc) => (
              <div key={acc.id} style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{acc.name}</div>
                  <X size={13} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => deleteAccommodation(acc.id)} />
                </div>
                {acc.address && <div style={{ fontSize: 11, color: "#5A5A56", marginTop: 2 }}>{acc.address}</div>}
                <div style={{ fontSize: 10, color: "#8C8C88", marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {acc.checkIn ? new Date(acc.checkIn + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ") : "?"}
                  {" → "}
                  {acc.checkOut ? new Date(acc.checkOut + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ") : "?"}
                </div>
                {acc.notes && <div style={{ fontSize: 11, color: "#5A5A56", marginTop: 6 }}>{acc.notes}</div>}
              </div>
            ))}

            {showAccForm ? (
              <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <input
                  placeholder="Nombre del alojamiento"
                  value={accDraft.name}
                  onChange={(e) => setAccDraft({ ...accDraft, name: e.target.value })}
                  style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }}
                />
                <input
                  placeholder="Dirección"
                  value={accDraft.address}
                  onChange={(e) => setAccDraft({ ...accDraft, address: e.target.value })}
                  style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input type="date" value={accDraft.checkIn} onChange={(e) => setAccDraft({ ...accDraft, checkIn: e.target.value })} style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 11 }} />
                  <input type="date" value={accDraft.checkOut} onChange={(e) => setAccDraft({ ...accDraft, checkOut: e.target.value })} style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 11 }} />
                </div>
                <input
                  placeholder="Notas (código de acceso, contacto...)"
                  value={accDraft.notes}
                  onChange={(e) => setAccDraft({ ...accDraft, notes: e.target.value })}
                  style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowAccForm(false)} style={btnSecondary}>Cancelar</button>
                  <button onClick={saveAccommodation} style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAccForm(true)} style={{ ...btnSecondary, marginBottom: 20 }}>
                + Añadir alojamiento
              </button>
            )}

            <div style={sectionLabel}>
              Día a día
            </div>
            {tripPlan.days.map((day) => {
              const isOpen = openDay === day.date;
              const dLabel = new Date(day.date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "short" }).replace(" de ", " ");
              return (
                <div key={day.date} style={{ background: "#fff", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                  <div
                    onClick={() => setOpenDay(isOpen ? null : day.date)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, textTransform: "capitalize" }}>{dLabel}</div>
                    <div style={{ fontSize: 10, color: "#8C8C88" }}>{day.activities.length} actividad{day.activities.length !== 1 ? "es" : ""}</div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "0 12px 12px" }}>
                      {day.activities.map((act) => (
                        <div key={act.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #FAFAF8" }}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#0E6E64", fontWeight: 700, minWidth: 38 }}>{act.time}</div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{act.title}</div>
                              {act.location && <div style={{ fontSize: 10, color: "#8C8C88" }}>{act.location}</div>}
                              {act.notes && <div style={{ fontSize: 10, color: "#5A5A56", marginTop: 2 }}>{act.notes}</div>}
                            </div>
                          </div>
                          <X size={13} color="#8C8C88" style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => deleteActivity(day.date, act.id)} />
                        </div>
                      ))}

                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input
                          type="time"
                          value={newActivity[day.date]?.time || ""}
                          onChange={(e) => setNewActivity((prev) => ({ ...prev, [day.date]: { ...prev[day.date], time: e.target.value } }))}
                          style={{ width: 76, padding: "7px 6px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 11 }}
                        />
                        <input
                          placeholder="Actividad"
                          value={newActivity[day.date]?.title || ""}
                          onChange={(e) => setNewActivity((prev) => ({ ...prev, [day.date]: { ...prev[day.date], title: e.target.value } }))}
                          onKeyDown={(e) => e.key === "Enter" && addActivity(day.date)}
                          style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
                        />
                        <button
                          onClick={() => addActivity(day.date)}
                          style={{ background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "gastos" && (
          <>
            <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={sectionLabel}>
                Tu balance
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: myNet >= 0 ? "#0E6E64" : "#FF5A3C" }}>
                {myNet >= 0 ? `+${myNet.toFixed(2)}€` : `${myNet.toFixed(2)}€`}
              </div>
              <div style={{ fontSize: 11, color: "#8C8C88" }}>
                {myNet >= 0 ? "Te deben en total" : "Debes en total"}
              </div>
            </div>

            {plan.accountsClosed && (
              <div style={{ background: "#161B2E", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#fff", textTransform: "uppercase", letterSpacing: 1 }}>
                    Cuentas cerradas · Resultado final
                  </div>
                  <button
                    onClick={toggleAccountsClosed}
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
                  >
                    Reabrir
                  </button>
                </div>
                {settlementPlan.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#fff" }}>Todo saldado, nadie debe nada 🎉</div>
                ) : (
                  settlementPlan.map((t, i) => {
                    const key = `${t.from}→${t.to}`;
                    const isPaid = (plan.paidTransfers || []).includes(key);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#fff", padding: "8px 0", borderBottom: i < settlementPlan.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                        <div>
                          <div>{t.from} → {t.to}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, marginTop: 2 }}>{t.amount.toFixed(2)}€</div>
                        </div>
                        <button
                          onClick={() => togglePaidTransfer(key, t)}
                          style={{
                            background: isPaid ? "#0E6E64" : "rgba(255,255,255,0.15)",
                            border: isPaid ? "none" : "1px solid rgba(255,255,255,0.4)",
                            color: "#fff",
                            borderRadius: 20,
                            padding: "5px 12px",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isPaid && <Check size={11} color="#fff" />}
                          {isPaid ? "Pagado" : "Marcar pagado"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div style={sectionLabelSm}>
              Gastos
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 14 }}>
              {plan.expenses.length === 0 && (
                <div style={{ fontSize: 12, color: "#8C8C88", padding: "14px 0" }}>Sin gastos todavía.</div>
              )}
              {plan.expenses.map((e, i) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < plan.expenses.length - 1 ? "1px solid #FAFAF8" : "none",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.desc}</div>
                    <div style={{ fontSize: 10, color: "#8C8C88" }}>
                      Pagó {e.paidBy} · entre {e.splitWith?.length || confirmed.length}
                      {e.splitWith && e.splitWith.length < confirmed.length ? (
                        <span style={{ color: "#FF5A3C", fontWeight: 700 }}> (no todos)</span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{e.amount.toFixed(2)}€</div>
                    {!plan.accountsClosed && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Pencil size={13} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => startEditExpense(e)} />
                        <Trash2 size={13} color="#FF5A3C" style={{ cursor: "pointer" }} onClick={() => setConfirmDeleteExpenseId(e.id)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!plan.accountsClosed && (
              <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={sectionLabel}>
                  {editingExpenseId ? "Editar gasto" : "Añadir gasto"}
                </div>
                <input
                  placeholder="Descripción"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="Importe €"
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
                  />
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
                  >
                    <option>Ana García</option>
                    {confirmed.filter((p) => p.name !== "Ana García").map((p) => (
                      <option key={p.userId}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>
                  ¿Entre quiénes se reparte?
                </div>
                <div style={{ marginBottom: 12 }}>
                  {confirmed.map((p) => (
                    <div
                      key={p.userId}
                      onClick={() => toggleSplit(p.name)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: splitWith.includes(p.name) ? "2px solid #161B2E" : "1px solid #DCDCD8",
                        marginBottom: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        background: splitWith.includes(p.name) ? "#FAFAF8" : "#fff",
                      }}
                    >
                      <span>{p.name}</span>
                      {splitWith.includes(p.name) && <Check size={14} color="#161B2E" />}
                    </div>
                  ))}
                  {splitWith.length === 0 && (
                    <div style={{ fontSize: 11, color: "#FF5A3C" }}>Selecciona al menos una persona.</div>
                  )}
                  {expenseAmount && splitWith.length > 0 && (
                    <div style={{ fontSize: 11, color: "#8C8C88", marginTop: 4 }}>
                      {(parseFloat(expenseAmount) / splitWith.length).toFixed(2)}€ por persona
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {editingExpenseId && (
                    <button onClick={resetExpenseForm} style={btnSecondary}>Cancelar</button>
                  )}
                  <button
                    onClick={saveExpense}
                    style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {editingExpenseId ? "Guardar cambios" : "Añadir gasto"}
                  </button>
                </div>
              </div>
            )}

            {plan.expensesEnabled && plan.expenses.length > 0 && (
              <button
                onClick={toggleAccountsClosed}
                style={{
                  width: "100%",
                  background: plan.accountsClosed ? "#fff" : "#0E6E64",
                  color: plan.accountsClosed ? "#161B2E" : "#fff",
                  border: plan.accountsClosed ? "1px solid #DCDCD8" : "none",
                  borderRadius: 8,
                  padding: "12px 0",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {plan.accountsClosed ? "Volver a editar gastos" : "Cerrar cuentas"}
              </button>
            )}
          </>
        )}
      </div>
      </>
      )}

      {rsvpPromptOpen && myRsvp && myRsvp !== "pending" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
              Cambiar tu respuesta
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {[
                { key: "yes", label: "Voy" },
                { key: "maybe", label: "Tal vez" },
                { key: "no", label: "No voy" },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => handleRsvpChoice(o.key)}
                  style={{
                    padding: "11px 0",
                    borderRadius: 8,
                    border: myRsvp === o.key ? "2px solid #161B2E" : "1px solid #DCDCD8",
                    background: myRsvp === o.key ? "#161B2E" : "#fff",
                    color: myRsvp === o.key ? "#fff" : "#161B2E",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div onClick={() => setRsvpPromptOpen(false)} style={{ textAlign: "center", fontSize: 12, color: "#8C8C88", cursor: "pointer", padding: "6px 0" }}>
              Cancelar
            </div>
          </div>
        </div>
      )}

      {showDeclineConfirm && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              ¿De verdad no vienes?
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>
              "{plan.title}" dejará de aparecer en tu lista de planes.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={reconsiderDecline} style={btnSecondary}>Me lo pienso</button>
              <button onClick={confirmDecline} style={{ ...btnPrimary, background: "#FF5A3C" }}>No, no voy</button>
            </div>
          </div>
        </div>
      )}

      {confirmRemoveParticipant && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              ¿Quitar a {confirmRemoveParticipant.name} del plan?
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>
              Dejará de ver el chat, los gastos y las novedades de "{plan.title}". Tendrás que volver a invitarla si cambias de idea.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemoveParticipant(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={() => removeParticipant(confirmRemoveParticipant)} style={{ ...btnPrimary, background: "#FF5A3C" }}>Quitar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteListId && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              ¿Eliminar esta lista?
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>Se eliminarán todos sus elementos.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDeleteListId(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={() => deleteList(confirmDeleteListId)} style={{ ...btnPrimary, background: "#FF5A3C" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteExpenseId && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              ¿Eliminar este gasto?
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDeleteExpenseId(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={() => deleteExpense(confirmDeleteExpenseId)} style={{ ...btnPrimary, background: "#FF5A3C" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              ¿Eliminar "{plan.title}"?
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>
              Se borrará el plan, sus gastos y el chat. Esta acción no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={() => onDelete(plan.id)} style={{ ...btnPrimary, background: "#FF5A3C" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewPlanModal({ onClose, onCreate, existingPlan, initialDate, initialInvited }) {
  const isEdit = !!existingPlan;
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(existingPlan?.title || "");
  const [type, setType] = useState(existingPlan?.type || "Viaje");
  const [date, setDate] = useState(existingPlan?.start || initialDate || "");
  const [endDate, setEndDate] = useState(existingPlan?.end || "");
  const [time, setTime] = useState(existingPlan?.time || "");
  const [location, setLocation] = useState(existingPlan?.location || "");
  const [invited, setInvited] = useState(
    existingPlan
      ? existingPlan.participants.filter((p) => p.userId !== "me").map((p) => p.userId).filter((id) => FRIENDS.some((f) => f.id === id))
      : initialInvited || []
  );
  const [expensesEnabled, setExpensesEnabled] = useState(existingPlan?.expensesEnabled ?? true);
  const [itineraryEnabled, setItineraryEnabled] = useState(existingPlan?.itineraryEnabled ?? (existingPlan ? false : true));
  const [visibility, setVisibility] = useState(existingPlan?.guestListVisibility || "public_full");
  const [planVisibility, setPlanVisibility] = useState(existingPlan?.visibility || "publica");
  const [linkCopied, setLinkCopied] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const inviteLink = `cantixplora.app/invite/${Math.random().toString(36).slice(2, 9)}`;

  function toggleFriend(id) {
    setInvited((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function copyLink() {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function create() {
    if (isEdit) {
      onCreate({
        ...existingPlan,
        title: title || existingPlan.title,
        type,
        start: date,
        end: type === "Viaje" ? endDate || null : null,
        time: type === "Evento" || type === "Comida" ? time || null : null,
        location: location || existingPlan.location,
        expensesEnabled,
        itineraryEnabled,
        guestListVisibility: visibility,
        visibility: planVisibility,
        participants: [
          ...existingPlan.participants.filter((p) => p.userId === "me" || !FRIENDS.some((f) => f.id === p.userId) || invited.includes(p.userId)),
          ...invited
            .filter((id) => !existingPlan.participants.some((p) => p.userId === id))
            .map((id) => {
              const f = FRIENDS.find((fr) => fr.id === id);
              return { userId: id, name: f.name, rsvp: "pending", show: true };
            }),
        ],
      });
      return;
    }
    onCreate({
      id: "p" + Date.now(),
      title: title || "Nuevo plan",
      type,
      start: date,
      end: type === "Viaje" ? endDate || null : null,
      time: type === "Evento" || type === "Comida" ? time || null : null,
      location: location || "Por definir",
      expensesEnabled,
      itineraryEnabled,
      guestListVisibility: visibility,
      ownerId: "me",
      visibility: planVisibility,
      joinRequests: [],
      participants: [
        { userId: "me", name: "Ana García", rsvp: "yes", show: true },
        ...invited.map((id) => {
          const f = FRIENDS.find((fr) => fr.id === id);
          return { userId: id, name: f.name, rsvp: "pending", show: true };
        }),
      ],
      expenses: [],
      messages: [],
      lists: [],
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(22,27,46,0.5)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 20,
      }}
    >
      <div style={{ background: "#FAFAF8", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 18, fontWeight: 600 }}>{isEdit ? "Editar plan" : "Nuevo plan"}</div>
          <X size={20} onClick={onClose} style={{ cursor: "pointer" }} />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ flex: 1, height: 3, background: step >= s ? "#FF5A3C" : "#DCDCD8", borderRadius: 2 }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Finde en Sintra"
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
            />
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Tipo</label>
            <div style={{ display: "flex", gap: 6, margin: "6px 0 14px", flexWrap: "wrap" }}>
              {Object.keys(TYPE_COLOR).map((t) => (
                <div
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    cursor: "pointer",
                    border: type === t ? `2px solid ${TYPE_COLOR[t]}` : "1px solid #DCDCD8",
                    background: type === t ? TYPE_COLOR[t] : "#fff",
                    color: type === t ? "#fff" : "#161B2E",
                    fontWeight: 600,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={btnPrimary}>Siguiente</button>
          </>
        )}

        {step === 2 && (
          <>
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>
              {type === "Viaje" ? "Fecha de inicio" : "Fecha"}
            </label>
            <input
              type="date"
              value={date}
              min={isEdit ? undefined : todayStr}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
            />

            {type === "Viaje" && (
              <>
                <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Fecha de fin</label>
                <input
                  type="date"
                  value={endDate}
                  min={date || (isEdit ? undefined : todayStr)}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
                />
              </>
            )}

            {(type === "Evento" || type === "Comida") && (
              <>
                <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Hora</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
                />
              </>
            )}

            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Lugar (opcional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Sintra, Portugal"
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
            />
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={expensesEnabled} onChange={(e) => setExpensesEnabled(e.target.checked)} />
              Este plan tendrá gastos compartidos
            </label>
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input type="checkbox" checked={itineraryEnabled} onChange={(e) => setItineraryEnabled(e.target.checked)} />
              Activar "El Plan" (alojamiento, día a día, info importante)
            </label>
            <div style={{ margin: "14px 0" }}>
              <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Tipo de acceso</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {[
                  { key: "publica", label: "Pública" },
                  { key: "privada", label: "Privada" },
                ].map((o) => (
                  <div
                    key={o.key}
                    onClick={() => setPlanVisibility(o.key)}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "9px 0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: planVisibility === o.key ? "2px solid #161B2E" : "1px solid #DCDCD8",
                      background: planVisibility === o.key ? "#161B2E" : "#fff",
                      color: planVisibility === o.key ? "#fff" : "#161B2E",
                    }}
                  >
                    {o.label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: "#8C8C88", marginTop: 6, lineHeight: 1.4 }}>
                {planVisibility === "privada"
                  ? "Quien se una por enlace deberá ser aprobado por ti antes de entrar."
                  : "Quien tenga el enlace se une directamente, sin aprobación."}
              </div>
            </div>
            <div style={{ margin: "14px 0" }}>
              <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Visibilidad de invitados</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginTop: 6 }}
              >
                <option value="public_full">Nombres visibles</option>
                <option value="public_count">Solo número</option>
                <option value="hidden">Oculta</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>Atrás</button>
              <button onClick={() => setStep(3)} style={btnPrimary}>Siguiente</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase" }}>Invitar amigos</label>
            <input
              placeholder="Buscar amigo..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 20, border: "1px solid #DCDCD8", fontSize: 12, margin: "8px 0", boxSizing: "border-box" }}
            />
            {invited.length > 0 && (
              <div style={{ fontSize: 10.5, color: "#8C8C88", marginBottom: 6 }}>
                {invited.length} invitado{invited.length !== 1 ? "s" : ""}
              </div>
            )}
            <div style={{ margin: "0 0 16px" }}>
              {FRIENDS.filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase())).map((f) => (
                <div
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "#fff",
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: "pointer",
                    border: invited.includes(f.id) ? "2px solid #161B2E" : "1px solid #E6E6E3",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: f.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                      {f.initials}
                    </div>
                    <span style={{ fontSize: 13 }}>{f.name}</span>
                  </div>
                  {invited.includes(f.id) && <Check size={16} color="#161B2E" />}
                </div>
              ))}
              {FRIENDS.filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase())).length === 0 && (
                <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "10px 0" }}>Sin resultados para "{friendSearch}".</div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 8px" }}>
              O invita por enlace
            </div>
            <div style={{ fontSize: 11, color: "#8C8C88", marginBottom: 8 }}>
              Para quienes no tienes agregados como amigos todavía.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fff",
                border: "1px solid #DCDCD8",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#161B2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {inviteLink}
              </span>
              <button
                onClick={copyLink}
                style={{
                  background: linkCopied ? "#0E6E64" : "#161B2E",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {linkCopied ? "Copiado ✓" : "Copiar"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>Atrás</button>
              <button onClick={create} style={btnPrimary}>{isEdit ? "Guardar cambios" : "Crear plan"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnPrimary = {
  width: "100%",
  background: "#161B2E",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "13px 0",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const btnSecondary = {
  flex: 1,
  background: "#fff",
  color: "#161B2E",
  border: "1px solid #DCDCD8",
  borderRadius: 8,
  padding: "13px 0",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

function ListTemplatesManager({ templates, onSaveTemplate, onUpdateTemplate, onDeleteTemplate, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newItems, setNewItems] = useState([]);
  const [newItemText, setNewItemText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function addItem() {
    if (!newItemText.trim()) return;
    setNewItems((prev) => [...prev, newItemText]);
    setNewItemText("");
  }

  function removeItem(i) {
    setNewItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startNew() {
    setEditingId(null);
    setNewTitle("");
    setNewItems([]);
    setNewItemText("");
    setShowNewForm(true);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setNewTitle(t.title);
    setNewItems([...t.items]);
    setNewItemText("");
    setExpandedId(null);
    setShowNewForm(true);
  }

  function saveForm() {
    if (!newTitle.trim() || newItems.length === 0) return;
    if (editingId) {
      onUpdateTemplate(editingId, { title: newTitle, items: newItems });
    } else {
      onSaveTemplate({ id: "t" + Date.now(), title: newTitle, items: newItems });
    }
    setNewTitle("");
    setNewItems([]);
    setNewItemText("");
    setEditingId(null);
    setShowNewForm(false);
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F0F0EE", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "85%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600 }}>Plantillas de listas</div>
          <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={onClose} />
        </div>

        {(!templates || templates.length === 0) && !showNewForm && (
          <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "16px 0" }}>
            Aún no tienes plantillas guardadas. Se crean desde las listas de un plan, o aquí mismo.
          </div>
        )}

        {templates && templates.map((t) => {
          const isOpen = expandedId === t.id;
          return (
            <div key={t.id} style={{ ...whiteCard, marginBottom: 8, overflow: "hidden" }}>
              <div
                onClick={() => setExpandedId(isOpen ? null : t.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bookmark size={14} color="#0E6E64" fill="#0E6E64" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: "#8C8C88" }}>{t.items.length} elementos</span>
                  <Pencil size={14} color="#8C8C88" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); startEdit(t); }} />
                  <Trash2 size={14} color="#FF5A3C" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }} />
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: "0 14px 12px" }}>
                  {t.items.map((text, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#5A5A56", padding: "3px 0" }}>• {text}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {showNewForm ? (
          <div style={{ ...whiteCard, padding: 14, marginTop: 8 }}>
            <div style={sectionLabelSm}>{editingId ? "Editar plantilla" : "Nueva plantilla"}</div>
            <input
              placeholder="Ej: Qué llevar a la playa"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
            />
            {newItems.map((text, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span style={{ fontSize: 12 }}>• {text}</span>
                <X size={12} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => removeItem(i)} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, margin: "8px 0 12px" }}>
              <input
                placeholder="Añadir elemento..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
              />
              <button onClick={addItem} style={{ background: "#F5F5F3", color: "#161B2E", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowNewForm(false); setEditingId(null); }} style={btnSecondary}>Cancelar</button>
              <button onClick={saveForm} style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {editingId ? "Guardar cambios" : "Guardar plantilla"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={startNew} style={{ ...btnSecondary, width: "100%", marginTop: 8 }}>
            + Nueva plantilla
          </button>
        )}
      </div>

      {confirmDeleteId && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }} onClick={() => setConfirmDeleteId(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 20, width: "80%" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>¿Eliminar esta plantilla?</div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>Las listas ya creadas a partir de ella no se ven afectadas.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={() => { onDeleteTemplate(confirmDeleteId); setConfirmDeleteId(null); }} style={{ ...btnPrimary, background: "#FF5A3C" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ profile, onSave, templates, onSaveTemplate, onUpdateTemplate, onDeleteTemplate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [usernameError, setUsernameError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(profile.photo);
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);

  function startEdit() {
    setForm(profile);
    setPhotoPreview(profile.photo);
    setUsernameError("");
    setEditing(true);
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function validateUsername(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "El nombre de usuario es obligatorio.";
    if (!/^[a-z0-9._]{3,20}$/.test(normalized)) return "Solo minúsculas, números, puntos y guiones bajos (3-20 caracteres).";
    if (TAKEN_USERNAMES.includes(normalized) && normalized !== profile.username) return "Ese nombre de usuario ya está en uso.";
    return "";
  }

  function save() {
    const err = validateUsername(form.username);
    if (err) {
      setUsernameError(err);
      return;
    }
    onSave({ ...form, username: form.username.trim().toLowerCase(), photo: photoPreview });
    setEditing(false);
  }

  const displayed = editing ? { ...form, photo: photoPreview } : profile;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 20, fontWeight: 600 }}>Perfil</div>
        {!editing && (
          <button
            onClick={startEdit}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #DCDCD8", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          {displayed.photo ? (
            <img src={displayed.photo} alt="Foto de perfil" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(22,27,46,0.15)" }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#161B2E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, border: "3px solid #fff", boxShadow: "0 2px 8px rgba(22,27,46,0.15)" }}>
              {getInitials(profile.name)}
            </div>
          )}
          {editing && (
            <label
              style={{
                position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%",
                background: "#FF5A3C", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", border: "2px solid #fff",
              }}
            >
              <Pencil size={12} color="#fff" />
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <FieldRow
          label="Nombre"
          value={editing ? form.name : profile.name}
          editing={editing}
          onChange={(v) => setForm({ ...form, name: v })}
        />
        <FieldRow
          label="Nombre de usuario"
          value={editing ? form.username : `@${profile.username}`}
          prefix={editing ? "@" : ""}
          editing={editing}
          onChange={(v) => {
            setForm({ ...form, username: v });
            setUsernameError("");
          }}
          error={usernameError}
        />
        <FieldRow
          label="Email"
          value={editing ? form.email : profile.email}
          editing={editing}
          type="email"
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <FieldRow
          label="Teléfono"
          value={editing ? form.phone : profile.phone}
          editing={editing}
          type="tel"
          last
          onChange={(v) => setForm({ ...form, phone: v })}
        />
      </div>

      {editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditing(false)} style={btnSecondary}>Cancelar</button>
          <button onClick={save} style={btnPrimary}>Guardar cambios</button>
        </div>
      )}

      <div style={{ marginTop: 20, background: "#fff", borderRadius: 10, padding: 14 }}>
        <div style={sectionLabel}>
          Ajustes
        </div>
        <div onClick={() => setShowTemplatesManager(true)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, cursor: "pointer" }}><span>Plantillas de listas</span><span>›</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}><span>Notificaciones</span><span>›</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}><span>Sincronizar calendario</span><span>›</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}><span>Cuenta</span><span>›</span></div>
      </div>

      {showTemplatesManager && (
        <ListTemplatesManager
          templates={templates}
          onSaveTemplate={onSaveTemplate}
          onUpdateTemplate={onUpdateTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onClose={() => setShowTemplatesManager(false)}
        />
      )}
    </div>
  );
}

function FieldRow({ label, value, editing, onChange, type = "text", prefix = "", error, last }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid #FAFAF8" }}>
      <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div style={{ display: "flex", alignItems: "center", border: `1px solid ${error ? "#FF5A3C" : "#DCDCD8"}`, borderRadius: 6, padding: "6px 8px" }}>
          {prefix && <span style={{ fontSize: 13, color: "#8C8C88", marginRight: 2 }}>{prefix}</span>}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, flex: 1 }}
          />
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#161B2E" }}>{value}</div>
      )}
      {error && <div style={{ fontSize: 10, color: "#FF5A3C", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const SEED_LIST_TEMPLATES = [
  { id: "t1", title: "Qué llevar de viaje", items: ["Cargador", "Pasaporte/DNI", "Neceser", "Adaptador de enchufe"] },
  { id: "t2", title: "Lista de camping", items: ["Tienda de campaña", "Saco de dormir", "Linterna", "Repelente de mosquitos"] },
];

const SEED_NOTIFICATIONS = [
  { id: "n1", type: "plan_invite", text: "Marta López te invitó a Cena Marta", read: false, icon: "invite", planId: "p2", targetTab: "detalles" },
  { id: "n2", type: "new_expense", text: "Julián Ruiz añadió un gasto en Finde en Sintra", read: false, icon: "expense", planId: "p1", targetTab: "gastos" },
  { id: "n3", type: "rsvp_reminder", text: "Recuerda confirmar tu asistencia a Cumple Diego", read: true, icon: "reminder", planId: "p3", targetTab: "detalles" },
  { id: "n4", type: "new_message", text: "Nuevo mensaje de Marta en Finde en Sintra", read: true, icon: "message", planId: "p1", targetTab: "chat" },
];

const PENDING_FRIEND_REQUESTS = [
  { id: "r1", name: "Diego Costa", initials: "DC", color: "#6B5CA5" },
  { id: "r2", name: "Sofía Nieto", initials: "SN", color: "#0E6E64" },
];

function AmigosView({ requests, setRequests, notifications, onMarkAllRead, plans, onProposePlan, onOpenNotification }) {
  const [subTab, setSubTab] = useState("invitaciones");
  const [viewingFriend, setViewingFriend] = useState(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [friendListSearch, setFriendListSearch] = useState("");
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const inviteLink = useMemo(() => `cantixplora.app/u/${Math.random().toString(36).slice(2, 9)}`, []);

  function accept(id) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }
  function reject(id) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  const iconFor = (type) => {
    if (type === "plan_invite") return <UserPlus size={15} color="#0E6E64" />;
    if (type === "new_expense" || type === "expense_settled") return <Receipt size={15} color="#0E6E64" />;
    if (type === "rsvp_reminder") return <CalendarClock size={15} color="#FF5A3C" />;
    return <MessageCircle size={15} color="#161B2E" />;
  };

  const inboxCount = requests.length + notifications.filter((n) => !n.read).length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 14 }}>
        Amigos
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[
          { key: "invitaciones", label: `Invitaciones${inboxCount > 0 ? ` (${inboxCount})` : ""}` },
          { key: "amigos", label: `Amigos (${FRIENDS.length})` },
        ].map((t) => (
          <div
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 0",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: subTab === t.key ? "#161B2E" : "#fff",
              color: subTab === t.key ? "#fff" : "#161B2E",
              border: subTab === t.key ? "none" : "1px solid #DCDCD8",
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {subTab === "invitaciones" && (
        <>
          {requests.length > 0 && (
            <>
              <div style={sectionLabel}>
                Solicitudes de amistad ({requests.length})
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 20 }}>
                {requests.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < requests.length - 1 ? "1px solid #FAFAF8" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: r.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                        {r.initials}
                      </div>
                      <span style={{ fontSize: 13 }}>{r.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => reject(r.id)}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: "#F5F5F3", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <X size={13} color="#8C8C88" />
                      </button>
                      <button
                        onClick={() => accept(r.id)}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: "#161B2E", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <Check size={13} color="#fff" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={sectionLabelBare}>
              Notificaciones
            </div>
            {notifications.some((n) => !n.read) && (
              <div onClick={onMarkAllRead} style={{ fontSize: 10.5, color: "#161B2E", fontWeight: 600, cursor: "pointer" }}>
                Marcar todas leídas
              </div>
            )}
          </div>
          {notifications.length === 0 && requests.length === 0 && (
            <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "20px 0" }}>
              No tienes invitaciones ni notificaciones nuevas.
            </div>
          )}
          {notifications.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px" }}>
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => onOpenNotification(n)}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: i < notifications.length - 1 ? "1px solid #FAFAF8" : "none", cursor: "pointer" }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#F5F5F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {iconFor(n.type)}
                  </div>
                  <div style={{ fontSize: 12, color: n.read ? "#8C8C88" : "#161B2E", fontWeight: n.read ? 400 : 600, lineHeight: 1.4, flex: 1 }}>
                    {n.text}
                  </div>
                  {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5A3C", marginTop: 5, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {subTab === "amigos" && (
        <>
          <div style={sectionLabel}>
            Tus amigos ({FRIENDS.length})
          </div>
          <input
            placeholder="Buscar amigo..."
            value={friendListSearch}
            onChange={(e) => setFriendListSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 20, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 10, boxSizing: "border-box" }}
          />
          <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 16 }}>
            {FRIENDS.filter((f) => f.name.toLowerCase().includes(friendListSearch.toLowerCase())).map((f, i, arr) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #FAFAF8" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: f.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                    {f.initials}
                  </div>
                  <span style={{ fontSize: 13 }}>{f.name}</span>
                </div>
                <div
                  onClick={() => setViewingFriend(f)}
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                >
                  <span style={{ fontSize: 10, color: "#0E6E64", fontWeight: 700 }}>Ver calendario</span>
                  <ChevronLeft size={12} color="#0E6E64" style={{ transform: "rotate(180deg)" }} />
                </div>
              </div>
            ))}
            {FRIENDS.filter((f) => f.name.toLowerCase().includes(friendListSearch.toLowerCase())).length === 0 && (
              <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "14px 0" }}>Sin resultados para "{friendListSearch}".</div>
            )}
          </div>
          <button onClick={() => setShowInviteLink(true)} style={btnSecondary}>+ Invitar amigos</button>
          <div
            onClick={() => setShowAvailability(true)}
            style={{ ...btnSecondary, marginTop: 8, background: "#161B2E", color: "#fff", textAlign: "center", cursor: "pointer" }}
          >
            📅 Buscar hueco común
          </div>
        </>
      )}

      {viewingFriend && (
        <FriendCalendarSheet friend={viewingFriend} plans={plans} onClose={() => setViewingFriend(null)} />
      )}
      {showAvailability && (
        <AvailabilityFinder
          plans={plans}
          onClose={() => setShowAvailability(false)}
          onProposePlan={(date, friendIds) => {
            setShowAvailability(false);
            onProposePlan(date, friendIds);
          }}
        />
      )}
      {showInviteLink && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={() => setShowInviteLink(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", borderRadius: "18px 18px 0 0", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600 }}>Invitar amigos</div>
              <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => setShowInviteLink(false)} />
            </div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 14 }}>
              Comparte tu enlace personal. Quien se registre desde él aparecerá automáticamente en tus solicitudes de amistad.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#F0F0EE",
                border: "1px solid #DCDCD8",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#161B2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {inviteLink}
              </span>
              <button
                onClick={() => {
                  setInviteLinkCopied(true);
                  setTimeout(() => setInviteLinkCopied(false), 1500);
                }}
                style={{
                  background: inviteLinkCopied ? "#0E6E64" : "#161B2E",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: 10,
                }}
              >
                {inviteLinkCopied ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, meta, onClick, isLast }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: isLast ? "none" : "1px solid #FAFAF8",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLOR[plan.type] || "#161B2E", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plan.title}</span>
      </div>
      <span style={{ fontSize: 10, color: "#8C8C88", flexShrink: 0, marginLeft: 8 }}>{meta}</span>
    </div>
  );
}

function InicioView({ plans, reminders, profile, onOpenPlan, onGoToPlanes, onCreatePlan, onSelectDay, onToggleReminderDone, onQuickAddEvent, onQuickAddReminder, myPendingExpense }) {
  const todayISO = new Date().toISOString().split("T")[0];
  const myRsvp = (p) => p.participants.find((part) => part.userId === "me")?.rsvp;
  const visiblePlans = plans.filter((p) => myRsvp(p) !== "no");
  const upcoming = visiblePlans
    .filter((p) => p.start >= todayISO)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const nextPlan = upcoming[0];
  const thisWeek = upcoming.slice(0, 4);
  const upcomingReminders = (reminders || [])
    .filter((r) => r.date >= todayISO && !r.done)
    .sort((a, b) => (a.date === b.date ? (a.time || "").localeCompare(b.time || "") : a.date.localeCompare(b.date)))
    .slice(0, 4);
  const todaysPlans = visiblePlans.filter((p) => (p.end ? todayISO >= p.start && todayISO <= p.end : p.start === todayISO));
  const todaysReminders = (reminders || []).filter((r) => r.date === todayISO);
  const nextPlanIsToday = nextPlan && todaysPlans.some((p) => p.id === nextPlan.id);
  const firstName = profile.name.split(" ")[0];

  if (visiblePlans.length === 0 && (!reminders || reminders.length === 0)) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#8C8C88", marginBottom: 2 }}>Hola, {firstName}</div>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 19, fontWeight: 600, margin: "8px 0 6px" }}>
          Aún no tienes planes
        </div>
        <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 20, maxWidth: 240 }}>
          Crea tu primer plan para empezar a organizar viajes, comidas o eventos con tus amigos.
        </div>
        <button onClick={onCreatePlan} style={{ ...btnPrimary, width: 200 }}>
          + Crear tu primer plan
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {nextPlan && !nextPlanIsToday && (
        <>
          <div style={sectionLabel}>
            Tu próximo plan
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 18 }}>
            <PlanRow
              plan={nextPlan}
              meta={`${new Date(nextPlan.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ")}${nextPlan.time ? ` · ${nextPlan.time}` : ""}`}
              onClick={() => onOpenPlan(nextPlan.id)}
              isLast
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: 18 }}>
        <CalendarView plans={plans} reminders={reminders} onOpenPlan={onOpenPlan} onSelectDay={onSelectDay} compact />
      </div>

      <div style={sectionLabel}>Hoy</div>
      {todaysPlans.length > 0 || todaysReminders.length > 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 18 }}>
          {todaysPlans.map((p, i) => (
            <PlanRow
              key={p.id}
              plan={p}
              meta={p.time || p.type}
              onClick={() => onOpenPlan(p.id)}
              isLast={i === todaysPlans.length - 1 && todaysReminders.length === 0}
            />
          ))}
          {todaysReminders.map((r, i) => {
            const hasItems = (r.items || []).length > 0;
            const subDone = hasItems ? r.items.filter((it) => it.done).length : 0;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < todaysReminders.length - 1 ? "1px solid #FAFAF8" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => onToggleReminderDone(r.id)}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: r.done ? "none" : "1.5px solid #DCDCD8",
                      background: r.done ? "#3F6FBF" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {r.done && <Check size={11} color="#fff" />}
                  </div>
                  <span
                    onClick={() => onSelectDay(r.date)}
                    style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: r.done ? "line-through" : "none", color: r.done ? "#8C8C88" : "#161B2E" }}
                  >
                    {r.title}
                  </span>
                  {hasItems && <span style={{ fontSize: 10, color: "#8C8C88" }}>{subDone}/{r.items.length}</span>}
                  {(r.sharedWith || []).length > 0 && (
                    <div style={{ display: "flex" }}>
                      {r.sharedWith.slice(0, 2).map((fid, fi) => {
                        const f = FRIENDS.find((fr) => fr.id === fid);
                        if (!f) return null;
                        return (
                          <div key={fid} style={{ width: 14, height: 14, borderRadius: "50%", background: f.color, color: "#fff", fontSize: 6, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", marginLeft: fi === 0 ? 0 : -5 }}>
                            {f.initials}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {r.time && <span style={{ fontSize: 10, color: "#8C8C88" }}>{r.time}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, padding: 18, marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 12 }}>
            No tienes nada para hoy.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onQuickAddEvent(todayISO)}
              style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 999, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              + Evento
            </button>
            <button
              onClick={() => onQuickAddReminder(todayISO)}
              style={{ flex: 1, background: "#fff", color: "#161B2E", border: "1px solid #DCDCD8", borderRadius: 999, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              + Tarea
            </button>
          </div>
        </div>
      )}

      {myPendingExpense && (
        <div
          onClick={() => onOpenPlan(myPendingExpense.plan.id)}
          style={{ background: "#fff", border: "1px solid #E6E6E3", borderRadius: 10, padding: 14, marginTop: 4, marginBottom: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={sectionLabelBare}>Pendiente</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Debes {myPendingExpense.amount.toFixed(2)}€ · {myPendingExpense.plan.title}</div>
          </div>
          <Wallet size={18} color="#FF5A3C" />
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <>
          <div style={sectionLabel}>Tus tareas de ruta</div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 14 }}>
            {upcomingReminders.map((r, i, arr) => {
              const d = new Date(r.date + "T00:00:00");
              const hasItems = (r.items || []).length > 0;
              const subDone = hasItems ? r.items.filter((it) => it.done).length : 0;
              return (
                <div
                  key={r.id}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #FAFAF8" : "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => onToggleReminderDone(r.id)}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: r.done ? "none" : "1.5px solid #DCDCD8",
                        background: r.done ? "#3F6FBF" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {r.done && <Check size={11} color="#fff" />}
                    </div>
                    <span
                      onClick={() => onSelectDay(r.date)}
                      style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: r.done ? "line-through" : "none", color: r.done ? "#8C8C88" : "#161B2E" }}
                    >
                      {r.title}
                    </span>
                    {hasItems && <span style={{ fontSize: 10, color: "#8C8C88" }}>{subDone}/{r.items.length}</span>}
                    {(r.sharedWith || []).length > 0 && (
                      <div style={{ display: "flex" }}>
                        {r.sharedWith.slice(0, 2).map((fid, fi) => {
                          const f = FRIENDS.find((fr) => fr.id === fid);
                          if (!f) return null;
                          return (
                            <div key={fid} style={{ width: 14, height: 14, borderRadius: "50%", background: f.color, color: "#fff", fontSize: 6, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", marginLeft: fi === 0 ? 0 : -5 }}>
                              {f.initials}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span onClick={() => onSelectDay(r.date)} style={{ fontSize: 10, color: "#8C8C88", cursor: "pointer" }}>
                    {d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ")}
                    {r.time ? ` · ${r.time}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {thisWeek.length > 1 && (
        <>
          <div style={sectionLabel}>
            Próximamente
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "4px 14px", marginBottom: 14 }}>
            {thisWeek.slice(1).map((p, i, arr) => (
              <PlanRow
                key={p.id}
                plan={p}
                meta={`${new Date(p.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(" de ", " ")}${p.time ? ` · ${p.time}` : ""}`}
                onClick={() => onOpenPlan(p.id)}
                isLast={i === arr.length - 1}
              />
            ))}
          </div>
        </>
      )}

      <div onClick={onGoToPlanes} style={{ textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 600, color: "#161B2E", cursor: "pointer" }}>
        Ver todos los planes →
      </div>
    </div>
  );
}

function PlanesView({ plans, onOpenPlan, typeFilter, setTypeFilter, dateFrom, setDateFrom, dateTo, setDateTo, showFilters, setShowFilters }) {
  const todayISO = new Date().toISOString().split("T")[0];

  function toggleType(t) {
    setTypeFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const filtered = plans.filter((p) => {
    if (typeFilter.length > 0 && !typeFilter.includes(p.type)) return false;
    if (dateFrom && p.start < dateFrom) return false;
    if (dateTo && p.start > dateTo) return false;
    return true;
  });

  const myRsvp = (p) => p.participants.find((part) => part.userId === "me")?.rsvp;

  // Los planes donde ya dijiste "No voy" desaparecen de tu lista
  const visible = filtered.filter((p) => myRsvp(p) !== "no");

  const pending = visible
    .filter((p) => p.start >= todayISO && (myRsvp(p) === "pending" || myRsvp(p) === "maybe"))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const upcoming = visible
    .filter((p) => p.start >= todayISO && myRsvp(p) !== "pending" && myRsvp(p) !== "maybe")
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const past = visible
    .filter((p) => p.start < todayISO)
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  const activeFilterCount = typeFilter.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  function clearFilters() {
    setTypeFilter([]);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 20, fontWeight: 600 }}>Mis planes</div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: activeFilterCount ? "#161B2E" : "#fff",
            color: activeFilterCount ? "#fff" : "#161B2E",
            border: "1px solid #DCDCD8",
            borderRadius: 20,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <SlidersHorizontal size={13} />
          Filtros{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showFilters && (
        <div style={{ background: "#fff", border: "1px solid #E6E6E3", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={sectionLabel}>
            Tipo de evento
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PLAN_TYPES.map((t) => (
              <div
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: "6px 11px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: typeFilter.includes(t) ? `2px solid ${TYPE_COLOR[t]}` : "1px solid #DCDCD8",
                  background: typeFilter.includes(t) ? TYPE_COLOR[t] : "#fff",
                  color: typeFilter.includes(t) ? "#fff" : "#161B2E",
                }}
              >
                {t}
              </div>
            ))}
          </div>

          <div style={sectionLabel}>
            Rango de fechas
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: activeFilterCount ? 12 : 0 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ flex: 1, padding: "8px 8px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 11 }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ flex: 1, padding: "8px 8px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 11 }}
            />
          </div>
          {activeFilterCount > 0 && (
            <div onClick={clearFilters} style={{ fontSize: 11, color: "#FF5A3C", fontWeight: 600, cursor: "pointer", textAlign: "right" }}>
              Limpiar filtros
            </div>
          )}
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div style={{ ...sectionLabel, color: "#C9A15A" }}>
            Pendientes ({pending.length})
          </div>
          {pending.map((p) => (
            <TicketCard key={p.id} plan={p} onClick={() => onOpenPlan(p)} />
          ))}
        </>
      )}

      <div style={sectionLabel}>
        Próximos ({upcoming.length})
      </div>
      {upcoming.length === 0 && (
        <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>No hay planes próximos con estos filtros.</div>
      )}
      {upcoming.map((p) => (
        <TicketCard key={p.id} plan={p} onClick={() => onOpenPlan(p)} />
      ))}

      <div style={{ fontSize: 11, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 1, margin: "20px 0 8px" }}>
        Pasados ({past.length})
      </div>
      {past.length === 0 && (
        <div style={{ fontSize: 12, color: "#8C8C88" }}>No hay planes pasados con estos filtros.</div>
      )}
      {past.map((p) => (
        <div key={p.id} style={{ opacity: 0.6 }}>
          <TicketCard plan={p} onClick={() => onOpenPlan(p)} />
        </div>
      ))}
    </div>
  );
}

function CalendarView({ plans, reminders, onOpenPlan, onSelectDay, compact }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const touchStartX = useRef(null);

  const eventDays = {};
  const pushEvent = (key, p) => {
    if (!eventDays[key]) eventDays[key] = [];
    eventDays[key].push(p);
  };
  plans.forEach((p) => {
    if (p.end) {
      let d = new Date(p.start + "T00:00:00");
      const endD = new Date(p.end + "T00:00:00");
      while (d <= endD) {
        pushEvent(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, p);
        d.setDate(d.getDate() + 1);
      }
    } else {
      const d = new Date(p.start + "T00:00:00");
      pushEvent(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, p);
    }
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Lunes = 0 ... Domingo = 6
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = firstOfMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(" de ", " ");
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 45) prevMonth();
    else if (delta < -45) nextMonth();
    touchStartX.current = null;
  }

  const monthPlans = plans
    .filter((p) => {
      const d = new Date(p.start + "T00:00:00");
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <div style={{ padding: compact ? 0 : 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 19, fontWeight: 600, textTransform: "capitalize" }}>
          {monthLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={prevMonth}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #DCDCD8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronLeft size={15} color="#161B2E" />
          </button>
          <button
            onClick={nextMonth}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #DCDCD8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronLeft size={15} color="#161B2E" style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#8C8C88" }}>Capas: Tú · Marta · Julián</span>
        {!isCurrentMonth && (
          <span onClick={goToday} style={{ fontSize: 11, color: "#161B2E", fontWeight: 700, cursor: "pointer" }}>
            Hoy
          </span>
        )}
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, touchAction: "pan-y" }}
      >
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#8C8C88", fontWeight: 700 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const dateKey = `${viewYear}-${viewMonth}-${d}`;
          const dayEvents = eventDays[dateKey] || [];
          const ev = dayEvents[0];
          const uniqueTypes = [...new Set(dayEvents.map((p) => p.type))];
          const isMulti = uniqueTypes.length > 1;
          const dayReminders = (reminders || []).filter((r) => {
            const rd = new Date(r.date + "T00:00:00");
            return `${rd.getFullYear()}-${rd.getMonth()}-${rd.getDate()}` === dateKey;
          });
          const hasReminder = dayReminders.length > 0;
          const allReminderesDone = hasReminder && dayReminders.every((r) => r.done);
          const isToday = isCurrentMonth && d === now.getDate();
          const cellDate = new Date(viewYear, viewMonth, d);
          const isPast = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isoDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const textColor = isPast ? "#B8B2A8" : isMulti ? "#161B2E" : ev ? "#fff" : "#161B2E";
          return (
            <div
              key={d}
              onClick={() => (onSelectDay ? onSelectDay(isoDate) : ev && onOpenPlan(ev))}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 8,
                border: isToday ? "2px solid #161B2E" : isMulti && !isPast ? "1px solid #C7C7C2" : "1px solid #E6E6E3",
                background: isPast ? "#F0F0EE" : isMulti ? "#fff" : ev ? TYPE_COLOR[ev.type] : "#fff",
                color: textColor,
                opacity: isPast ? 0.6 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: ev && !isPast ? 700 : 400,
                cursor: "pointer",
                gap: 2,
              }}
            >
              <span>{d}</span>
              {isMulti && !isPast && (
                <div style={{ display: "flex", gap: 2 }}>
                  {uniqueTypes.slice(0, 4).map((t) => (
                    <div key={t} style={{ width: 4, height: 4, borderRadius: "50%", background: TYPE_COLOR[t] }} />
                  ))}
                </div>
              )}
              {hasReminder && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 3,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: allReminderesDone ? "transparent" : ev && !isMulti ? "#fff" : "#3F6FBF",
                    border: allReminderesDone ? `1px solid ${ev && !isMulti ? "#fff" : "#3F6FBF"}` : "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <>
          <div style={sectionLabel}>
            {monthPlans.length > 0 ? `Planes en ${monthLabel}` : "Sin planes este mes"}
          </div>
          {monthPlans.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpenPlan(p)}
              style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #E6E6E3", cursor: "pointer", fontSize: 13 }}
            >
              <span>{p.title}</span>
              <span style={{ color: TYPE_COLOR[p.type], fontWeight: 700, fontSize: 11 }}>{p.type}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// --- Rutas (pensado para producción: cada sección y cada plan tendrá su propia URL) ---
// Estructura prevista: #/inicio  #/calendario  #/planes  #/amigos  #/perfil  #/plan/:id
// Nota: la sincronización real con window.history se implementará en el desarrollo final
// (React Navigation / React Router). Aquí se evita tocar window.history directamente porque
// el entorno de vista previa del artifact ejecuta en un iframe con sandbox restringido,
// donde pushState puede lanzar un SecurityError y bloquear el montaje de toda la app.

function AvailabilityFinder({ plans, onClose, onProposePlan }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const namesToCheck = ["Ana García", ...selected.map((id) => FRIENDS.find((f) => f.id === id)?.name).filter(Boolean)];

  const busyByDate = {};
  plans.forEach((p) => {
    // "Tal vez" también cuenta como ocupado: no podemos asumir que esa persona está libre
    const busyNames = p.participants.filter((part) => part.rsvp === "yes" || part.rsvp === "maybe").map((part) => part.name);
    const relevantNames = busyNames.filter((n) => namesToCheck.includes(n));
    if (relevantNames.length === 0) return;
    const addBusy = (dateISO) => {
      if (!busyByDate[dateISO]) busyByDate[dateISO] = new Set();
      relevantNames.forEach((n) => busyByDate[dateISO].add(n));
    };
    if (p.end) {
      let d = new Date(p.start + "T00:00:00");
      const endD = new Date(p.end + "T00:00:00");
      while (d <= endD) {
        addBusy(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
      }
    } else {
      addBusy(p.start);
    }
  });

  const today = new Date();
  const freeDatesSet = new Set();
  const freeDaysList = [];
  if (selected.length > 0) {
    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const busySet = busyByDate[iso];
      const allFree = !busySet || namesToCheck.every((n) => !busySet.has(n));
      if (allFree) {
        freeDatesSet.add(iso);
        if (freeDaysList.length < 6) freeDaysList.push({ iso, date: d });
      }
    }
  }

  // Grid del mes actual, marcando los días libres encontrados
  const gridYear = today.getFullYear();
  const gridMonth = today.getMonth();
  const daysInMonth = new Date(gridYear, gridMonth + 1, 0).getDate();
  const leadingBlanks = (new Date(gridYear, gridMonth, 1).getDay() + 6) % 7;
  const gridCells = [...Array.from({ length: leadingBlanks }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F0F0EE", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "82%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600 }}>Buscar hueco común</div>
          <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={onClose} />
        </div>
        <div style={{ fontSize: 11, color: "#8C8C88", marginBottom: 14, lineHeight: 1.4 }}>
          Elige con quién quieres quedar y te mostramos los próximos días en los que nadie tiene plan confirmado ni en "tal vez".
        </div>

        <div style={sectionLabelSm}>Con quién</div>
        <input
          placeholder="Buscar amigo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 20, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 10, boxSizing: "border-box" }}
        />
        {selected.length > 0 && (
          <div style={{ fontSize: 10.5, color: "#8C8C88", marginBottom: 8 }}>
            {selected.length} seleccionado{selected.length !== 1 ? "s" : ""}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {FRIENDS.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())).map((f) => (
            <div
              key={f.id}
              onClick={() => toggle(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px 6px 6px",
                borderRadius: 20,
                cursor: "pointer",
                border: selected.includes(f.id) ? `2px solid ${f.color}` : "1px solid #DCDCD8",
                background: selected.includes(f.id) ? f.color : "#fff",
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: selected.includes(f.id) ? "rgba(255,255,255,0.3)" : f.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
                {f.initials}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: selected.includes(f.id) ? "#fff" : "#161B2E" }}>{f.name.split(" ")[0]}</span>
            </div>
          ))}
          {FRIENDS.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div style={{ fontSize: 12, color: "#8C8C88" }}>Sin resultados para "{search}".</div>
          )}
        </div>

        {selected.length === 0 ? (
          <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "10px 0" }}>
            Selecciona al menos un amigo para ver huecos comunes.
          </div>
        ) : (
          <>
            <div style={sectionLabelSm}>
              {today.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(" de ", " ")}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 10, color: "#8C8C88" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0E6E64" }} />
                Libre para todos
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 16 }}>
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#8C8C88", fontWeight: 700 }}>{d}</div>
              ))}
              {gridCells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${gridYear}-${String(gridMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isFree = freeDatesSet.has(iso);
                const isToday = d === today.getDate();
                const isPast = new Date(gridYear, gridMonth, d) < new Date(gridYear, gridMonth, today.getDate());
                return (
                  <div
                    key={d}
                    onClick={() => isFree && onProposePlan(iso, selected)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      border: isToday ? "2px solid #161B2E" : "1px solid #E6E6E3",
                      background: isFree ? "#0E6E64" : "#fff",
                      color: isFree ? "#fff" : isPast ? "#C7C7C2" : "#161B2E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: isFree ? 700 : 400,
                      cursor: isFree ? "pointer" : "default",
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>

            <div style={sectionLabelSm}>Próximos días libres para todos</div>
            {freeDaysList.length === 0 ? (
              <div style={{ fontSize: 12, color: "#8C8C88", padding: "10px 0" }}>
                No hay huecos libres en las próximas 3 semanas entre todos los seleccionados.
              </div>
            ) : (
              freeDaysList.map((f) => (
                <div
                  key={f.iso}
                  onClick={() => onProposePlan(f.iso, selected)}
                  style={{ ...whiteCard, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                    {f.date.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" }).replace(" de ", " ")}
                  </span>
                  <span style={{ fontSize: 11, color: "#0E6E64", fontWeight: 700 }}>Crear plan →</span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FriendCalendarSheet({ friend, plans, onClose }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const busyDays = {};
  plans.forEach((p) => {
    const isFriendIn = p.participants.some((part) => part.name === friend.name && part.rsvp === "yes");
    if (!isFriendIn) return;
    if (p.end) {
      let d = new Date(p.start + "T00:00:00");
      const endD = new Date(p.end + "T00:00:00");
      while (d <= endD) {
        busyDays[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = true;
        d.setDate(d.getDate() + 1);
      }
    } else {
      const d = new Date(p.start + "T00:00:00");
      busyDays[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = true;
    }
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const cells = [...Array.from({ length: leadingBlanks }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = firstOfMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(" de ", " ");

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F0F0EE", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "80%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: friend.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
              {friend.initials}
            </div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600 }}>{friend.name}</div>
          </div>
          <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={onClose} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 4px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={prevMonth} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #DCDCD8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={13} color="#161B2E" />
            </button>
            <button onClick={nextMonth} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #DCDCD8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={13} color="#161B2E" style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#fff", border: "1px solid #DCDCD8" }} />
            <span style={{ fontSize: 10, color: "#8C8C88" }}>Libre</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#161B2E" }} />
            <span style={{ fontSize: 10, color: "#8C8C88" }}>Ocupado</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#8C8C88", fontWeight: 700 }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const isBusy = busyDays[`${viewYear}-${viewMonth}-${d}`];
            const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && d === now.getDate();
            return (
              <div
                key={d}
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  border: isToday ? "2px solid #161B2E" : "1px solid #E6E6E3",
                  background: isBusy ? "#161B2E" : "#fff",
                  color: isBusy ? "#fff" : "#161B2E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: isBusy ? 700 : 400,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#8C8C88", marginTop: 8, lineHeight: 1.4 }}>
          Solo se muestra si tiene o no plan ese día — no verás el detalle de qué plan es.
        </div>
      </div>
    </div>
  );
}

function DaySheet({ date, plans, reminders, onClose, onOpenPlan, onAddEvent, onAddReminder, onUpdateReminder, onToggleReminderDone, onDeleteReminder, initialShowReminderForm, templates }) {
  const [showReminderForm, setShowReminderForm] = useState(!!initialShowReminderForm);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderSharedWith, setReminderSharedWith] = useState([]);
  const [reminderItems, setReminderItems] = useState([]);
  const [newSubItemText, setNewSubItemText] = useState("");
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const dayPlans = plans.filter((p) => {
    if (p.end) return date >= p.start && date <= p.end;
    return p.start === date;
  });
  const dayReminders = reminders.filter((r) => r.date === date);
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" }).replace(" de ", " ");

  function resetReminderForm() {
    setEditingReminderId(null);
    setReminderTitle("");
    setReminderTime("");
    setReminderSharedWith([]);
    setReminderItems([]);
    setNewSubItemText("");
    setShowSharePanel(false);
    setShareSearch("");
    setShowTemplatePicker(false);
  }

  function startAddReminder() {
    resetReminderForm();
    setShowReminderForm(true);
  }

  function startEditReminder(r) {
    setEditingReminderId(r.id);
    setReminderTitle(r.title);
    setReminderTime(r.time || "");
    setReminderSharedWith(r.sharedWith || []);
    setReminderItems(r.items || []);
    setNewSubItemText("");
    setShowSharePanel(false);
    setShareSearch("");
    setShowTemplatePicker(false);
    setShowReminderForm(true);
  }

  function toggleReminderShare(friendId) {
    setReminderSharedWith((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  }

  function addSubItem() {
    if (!newSubItemText.trim()) return;
    setReminderItems((prev) => [...prev, { id: "si" + Date.now(), text: newSubItemText, done: false }]);
    setNewSubItemText("");
  }

  function removeSubItem(itemId) {
    setReminderItems((prev) => prev.filter((it) => it.id !== itemId));
  }

  function toggleSubItemDone(itemId) {
    setReminderItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)));
  }

  function applyTemplateToItems(template) {
    setReminderItems((prev) => [
      ...prev,
      ...template.items.map((text, i) => ({ id: "si" + Date.now() + i, text, done: false })),
    ]);
    setShowTemplatePicker(false);
  }

  function saveReminder() {
    if (!reminderTitle.trim()) return;
    const payload = {
      title: reminderTitle,
      time: reminderTime || null,
      sharedWith: reminderSharedWith,
      items: reminderItems,
    };
    if (editingReminderId) {
      onUpdateReminder(editingReminderId, payload);
    } else {
      onAddReminder({ id: "r" + Date.now(), date, done: false, ...payload });
    }
    resetReminderForm();
    setShowReminderForm(false);
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(22,27,46,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F0F0EE", width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "80%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>{dateLabel}</div>
          <X size={18} color="#8C8C88" style={{ cursor: "pointer" }} onClick={onClose} />
        </div>

        {dayPlans.length > 0 && (
          <>
            <div style={sectionLabelSm}>Planes</div>
            {dayPlans.map((p) => (
              <div
                key={p.id}
                onClick={() => onOpenPlan(p)}
                style={{ ...whiteCard, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[p.type] }}>{p.type}</span>
              </div>
            ))}
          </>
        )}

        {dayReminders.length > 0 && (
          <>
            <div style={{ ...sectionLabelSm, marginTop: dayPlans.length > 0 ? 14 : 0 }}>Tareas de ruta</div>
            {dayReminders.map((r) => {
              const subDone = (r.items || []).filter((it) => it.done).length;
              const hasItems = (r.items || []).length > 0;
              return (
                <div key={r.id} style={{ ...whiteCard, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => onToggleReminderDone(r.id)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: r.done ? "none" : "1.5px solid #DCDCD8",
                        background: r.done ? "#3F6FBF" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {r.done && <Check size={12} color="#fff" />}
                    </div>
                    <div onClick={() => startEditReminder(r)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, textDecoration: r.done ? "line-through" : "none", color: r.done ? "#8C8C88" : "#161B2E" }}>
                        {r.title}
                      </span>
                      {r.time && <span style={{ fontSize: 11, color: "#8C8C88", marginLeft: 8 }}>{r.time}</span>}
                      {hasItems && <span style={{ fontSize: 10, color: "#8C8C88", marginLeft: 8 }}>{subDone}/{r.items.length}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {(r.sharedWith || []).length > 0 && (
                      <div style={{ display: "flex" }}>
                        {r.sharedWith.slice(0, 3).map((fid, i) => {
                          const f = FRIENDS.find((fr) => fr.id === fid);
                          if (!f) return null;
                          return (
                            <div key={fid} style={{ width: 16, height: 16, borderRadius: "50%", background: f.color, color: "#fff", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", marginLeft: i === 0 ? 0 : -6 }}>
                              {f.initials}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Pencil size={13} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => startEditReminder(r)} />
                    <X size={14} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => onDeleteReminder(r.id)} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {dayPlans.length === 0 && dayReminders.length === 0 && !showReminderForm && (
          <div style={{ fontSize: 12, color: "#8C8C88", textAlign: "center", padding: "10px 0 18px" }}>
            No hay nada este día todavía.
          </div>
        )}

        {showReminderForm ? (
          <div style={{ ...whiteCard, padding: 14, marginTop: 14 }}>
            <div style={sectionLabelSm}>{editingReminderId ? "Editar tarea" : "Nueva tarea"}</div>
            <input
              placeholder="Ej: Llamar para reservar"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
            />
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 12, boxSizing: "border-box" }}
            />

            <div
              onClick={() => setShowSharePanel((v) => !v)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: showSharePanel ? 8 : 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus size={13} color="#161B2E" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Compartir{reminderSharedWith.length > 0 ? ` (${reminderSharedWith.length})` : ""}
                </span>
              </div>
              {reminderSharedWith.length > 0 && !showSharePanel && (
                <div style={{ display: "flex" }}>
                  {reminderSharedWith.slice(0, 3).map((fid, i) => {
                    const f = FRIENDS.find((fr) => fr.id === fid);
                    if (!f) return null;
                    return (
                      <div key={fid} style={{ width: 18, height: 18, borderRadius: "50%", background: f.color, color: "#fff", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", marginLeft: i === 0 ? 0 : -6 }}>
                        {f.initials}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showSharePanel && (
              <div style={{ marginBottom: 12 }}>
                <input
                  placeholder="Buscar amigo..."
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 20, border: "1px solid #DCDCD8", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FRIENDS.filter((f) => f.name.toLowerCase().includes(shareSearch.toLowerCase())).map((f) => (
                    <div
                      key={f.id}
                      onClick={() => toggleReminderShare(f.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px 5px 5px",
                        borderRadius: 20,
                        cursor: "pointer",
                        border: reminderSharedWith.includes(f.id) ? `2px solid ${f.color}` : "1px solid #DCDCD8",
                        background: reminderSharedWith.includes(f.id) ? f.color : "#fff",
                      }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: reminderSharedWith.includes(f.id) ? "rgba(255,255,255,0.3)" : f.color, color: "#fff", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {f.initials}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: reminderSharedWith.includes(f.id) ? "#fff" : "#161B2E" }}>{f.name.split(" ")[0]}</span>
                    </div>
                  ))}
                  {FRIENDS.filter((f) => f.name.toLowerCase().includes(shareSearch.toLowerCase())).length === 0 && (
                    <div style={{ fontSize: 11, color: "#8C8C88" }}>Sin resultados para "{shareSearch}".</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10, color: "#8C8C88", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Checklist (opcional)</div>
            {reminderItems.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                <div onClick={() => toggleSubItemDone(it.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                  <div
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: 4,
                      border: it.done ? "none" : "1.5px solid #DCDCD8",
                      background: it.done ? "#3F6FBF" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {it.done && <Check size={10} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 12, textDecoration: it.done ? "line-through" : "none", color: it.done ? "#8C8C88" : "#161B2E" }}>{it.text}</span>
                </div>
                <X size={12} color="#8C8C88" style={{ cursor: "pointer" }} onClick={() => removeSubItem(it.id)} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                placeholder="Ej: Reservar mesa"
                value={newSubItemText}
                onChange={(e) => setNewSubItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubItem()}
                style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid #DCDCD8", fontSize: 12 }}
              />
              <button onClick={addSubItem} style={{ background: "#F5F5F3", color: "#161B2E", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                +
              </button>
            </div>

            {templates && templates.length > 0 && (
              <div
                onClick={() => setShowTemplatePicker((v) => !v)}
                style={{ fontSize: 11, color: "#161B2E", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: showTemplatePicker ? 8 : 12 }}
              >
                <Bookmark size={12} color="#0E6E64" />
                O usa una plantilla guardada ({templates.length})
              </div>
            )}
            {showTemplatePicker && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => applyTemplateToItems(t)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", borderRadius: 8, border: "1px solid #E6E6E3", cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</span>
                    <span style={{ fontSize: 10, color: "#8C8C88" }}>{t.items.length} elementos</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowReminderForm(false);
                  resetReminderForm();
                }}
                style={btnSecondary}
              >
                Cancelar
              </button>
              <button onClick={saveReminder} style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Guardar
              </button>
            </div>
            {editingReminderId && (
              <div
                onClick={() => {
                  onDeleteReminder(editingReminderId);
                  setShowReminderForm(false);
                  resetReminderForm();
                }}
                style={{ textAlign: "center", fontSize: 11, color: "#FF5A3C", fontWeight: 600, cursor: "pointer", marginTop: 10 }}
              >
                Eliminar tarea
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => onAddEvent(date)} style={{ flex: 1, background: "#161B2E", color: "#fff", border: "none", borderRadius: 999, padding: "12px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              + Evento
            </button>
            <button onClick={startAddReminder} style={{ flex: 1, background: "#fff", color: "#161B2E", border: "1px solid #DCDCD8", borderRadius: 999, padding: "12px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              + Tarea
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onOpenGuestPreview }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) return;
    onLogin({ name: mode === "signup" ? name : "Ana García", email });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161B2E", padding: "48px 24px 24px", boxSizing: "border-box" }}>
      <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
        cantixplora
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
        Planes, gastos y calendario con tus amigos, en un solo sitio.
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: 20, flex: 1 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[
            { key: "login", label: "Iniciar sesión" },
            { key: "signup", label: "Crear cuenta" },
          ].map((o) => (
            <div
              key={o.key}
              onClick={() => setMode(o.key)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "9px 0",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: mode === o.key ? "#161B2E" : "#F0F0EE",
                color: mode === o.key ? "#fff" : "#161B2E",
              }}
            >
              {o.label}
            </div>
          ))}
        </div>

        {mode === "signup" && (
          <input
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 11, borderRadius: 8, border: "1px solid #DCDCD8", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
          />
        )}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 11, borderRadius: 8, border: "1px solid #DCDCD8", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ width: "100%", padding: 11, borderRadius: 8, border: "1px solid #DCDCD8", fontSize: 13, marginBottom: 16, boxSizing: "border-box" }}
        />

        <button onClick={submit} style={btnPrimary}>
          {mode === "signup" ? "Crear cuenta" : "Entrar"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E6E6E3" }} />
          <span style={{ fontSize: 10, color: "#8C8C88" }}>O CONTINÚA CON</span>
          <div style={{ flex: 1, height: 1, background: "#E6E6E3" }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btnSecondary, flex: 1 }}>Google</button>
          <button style={{ ...btnSecondary, flex: 1 }}>Apple</button>
        </div>
      </div>

      <div
        onClick={onOpenGuestPreview}
        style={{ textAlign: "center", padding: "18px 0 4px", fontSize: 12, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}
      >
        ¿Vienes de una invitación? Ver el plan sin crear cuenta →
      </div>
    </div>
  );
}

function GuestPlanPreview({ plan, onJoinAsGuest, onCreateAccount, onGoToLogin }) {
  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
  const confirmed = plan.participants.filter((p) => p.rsvp === "yes");

  function join() {
    if (!guestName.trim()) return;
    onJoinAsGuest(guestName);
    setJoined(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F0F0EE" }}>
      <div style={{ background: TYPE_COLOR[plan.type] || "#161B2E", color: "#fff", padding: "40px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div
            onClick={onGoToLogin}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 20,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Iniciar sesión
          </div>
        </div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.85, marginBottom: 4 }}>{plan.type}</div>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 22, fontWeight: 600 }}>{plan.title}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
          {plan.location} · {new Date(plan.start + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long" }).replace(" de ", " ")}
          {plan.time ? ` · ${plan.time}` : ""}
        </div>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {plan.guestListVisibility !== "hidden" && (
          <>
            <div style={sectionLabel}>{confirmed.length} confirmados</div>
            <div style={{ display: "flex", marginBottom: 20 }}>
              {confirmed.slice(0, 6).map((p, i) => {
                const f = friendMeta(p.name);
                return (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: p.name === "Ana García" ? "#161B2E" : f?.color || "#999", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #F0F0EE", marginLeft: i === 0 ? 0 : -10 }}>
                    {p.name === "Ana García" ? "AG" : f?.initials || getInitials(p.name)}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!joined ? (
          <div style={whiteCard}>
            <div style={{ padding: 16 }}>
              <div style={sectionLabelSm}>¿Vienes?</div>
              <input
                placeholder="Tu nombre"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                style={{ width: "100%", padding: 11, borderRadius: 8, border: "1px solid #DCDCD8", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
              />
              <button onClick={join} style={btnPrimary}>Unirme al plan</button>
              <div style={{ fontSize: 10.5, color: "#8C8C88", marginTop: 10, lineHeight: 1.4 }}>
                Te unes como invitado, sin crear cuenta. Podrás crear una más tarde para ver más funciones.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...whiteCard, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>¡Te has unido!</div>
            <div style={{ fontSize: 12, color: "#8C8C88", marginBottom: 16 }}>
              Crea una cuenta para chatear, ver gastos y organizar planes tú mismo.
            </div>
            <button onClick={onCreateAccount} style={btnPrimary}>Crear cuenta</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authScreen, setAuthScreen] = useState("login"); // login | guestPreview | app
  const [plans, setPlans] = useState(seedPlans);
  const [profile, setProfile] = useState({
    name: "Ana García",
    username: "ana.garcia",
    email: "ana.garcia@email.com",
    phone: "+34 600 123 456",
    photo: null,
  });
  const [tab, setTab] = useState("inicio");
  const [friendRequests, setFriendRequests] = useState(PENDING_FRIEND_REQUESTS);
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);
  const [openPlanInitialTab, setOpenPlanInitialTab] = useState(null);

  function openNotification(n) {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.planId) {
      setOpenPlanInitialTab(n.targetTab || "detalles");
      setOpenPlanId(n.planId);
    }
  }
  function openPlanNormal(id) {
    setOpenPlanInitialTab(null);
    setOpenPlanId(id);
  }
  function notifyPayment({ planTitle, from, to, amount }) {
    // "me" es quien marca el pago; simulamos la notificación que recibiría la otra persona
    const isMe = from === "Ana García";
    const text = isMe
      ? `Marcaste como pagado: le diste ${amount.toFixed(2)}€ a ${to} en ${planTitle}. Se le ha notificado.`
      : `${from} ha marcado como pagado ${amount.toFixed(2)}€ que te debía en ${planTitle}.`;
    setNotifications((prev) => [{ id: "n" + Date.now(), type: "expense_settled", text, read: false }, ...prev]);
  }
  const [planesTypeFilter, setPlanesTypeFilter] = useState([]);
  const [planesDateFrom, setPlanesDateFrom] = useState("");
  const [planesDateTo, setPlanesDateTo] = useState("");
  const [planesShowFilters, setPlanesShowFilters] = useState(false);
  const [openPlanId, setOpenPlanId] = useState(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanInitialDate, setNewPlanInitialDate] = useState(null);
  const [newPlanInitialInvited, setNewPlanInitialInvited] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [listTemplates, setListTemplates] = useState(SEED_LIST_TEMPLATES);

  function saveListTemplate(template) {
    setListTemplates((prev) => [...prev, template]);
  }
  function updateListTemplate(id, patch) {
    setListTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function deleteListTemplate(id) {
    setListTemplates((prev) => prev.filter((t) => t.id !== id));
  }
  const [selectedDay, setSelectedDay] = useState(null);
  const [daySheetAutoReminder, setDaySheetAutoReminder] = useState(false);

  function addReminder(reminder) {
    setReminders((prev) => [...prev, reminder]);
  }
  function updateReminder(id, patch) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function toggleReminderDone(id) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  }
  function deleteReminder(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }
  function openEventFromDay(date) {
    setNewPlanInitialDate(date);
    setSelectedDay(null);
    setShowNewPlan(true);
  }
  function quickAddReminder(date) {
    setDaySheetAutoReminder(true);
    setSelectedDay(date);
  }
  function proposePlanFromAvailability(date, friendIds) {
    setNewPlanInitialDate(date);
    setNewPlanInitialInvited(friendIds);
    setTab("planes");
    setShowNewPlan(true);
  }
  const [editingPlan, setEditingPlan] = useState(null);

  function navigateTo(tabKey) {
    setOpenPlanId(null);
    setTab(tabKey);
  }

  const openPlan = plans.find((p) => p.id === openPlanId);

  function updatePlan(updated) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const [pendingDeletePlan, setPendingDeletePlan] = useState(null);

  function deletePlan(id) {
    const plan = plans.find((p) => p.id === id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setOpenPlanId(null);
    setPendingDeletePlan(plan);
    setTimeout(() => {
      setPendingDeletePlan((current) => (current && current.id === id ? null : current));
    }, 5000);
  }

  function undoDeletePlan() {
    if (!pendingDeletePlan) return;
    setPlans((prev) => [pendingDeletePlan, ...prev]);
    setPendingDeletePlan(null);
  }

  function saveEdit(updated) {
    updatePlan(updated);
    setEditingPlan(null);
  }

  function createPlan(newPlan) {
    setPlans((prev) => [newPlan, ...prev]);
    setShowNewPlan(false);
    setOpenPlanInitialTab(null);
    setOpenPlanId(newPlan.id);
  }

  const myPendingExpense = useMemo(() => {
    for (const p of plans) {
      if (!p.expensesEnabled || p.expenses.length === 0) continue;
      const confirmed = p.participants.filter((x) => x.rsvp === "yes");
      const total = p.expenses.reduce((s, e) => s + e.amount, 0);
      const share = total / (confirmed.length || 1);
      const paid = p.expenses.filter((e) => e.paidBy === "Ana García").reduce((s, e) => s + e.amount, 0);
      const net = paid - share;
      if (net < -0.5) return { plan: p, amount: Math.abs(net) };
    }
    return null;
  }, [plans]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 12px", background: "#F0F0EE", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div
        style={{
          width: 380,
          height: 720,
          background: "#FAFAF8",
          borderRadius: 28,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(22,27,46,0.25)",
          border: "6px solid #161B2E",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {authScreen === "login" ? (
          <LoginScreen
            onLogin={({ name, email }) => {
              setProfile((prev) => ({ ...prev, name, email }));
              setAuthScreen("app");
            }}
            onOpenGuestPreview={() => setAuthScreen("guestPreview")}
          />
        ) : authScreen === "guestPreview" ? (
          <GuestPlanPreview
            plan={plans.find((p) => p.visibility === "publica") || plans[0]}
            onGoToLogin={() => setAuthScreen("login")}
            onCreateAccount={() => setAuthScreen("login")}
            onJoinAsGuest={(guestName) => {
              const previewPlan = plans.find((p) => p.visibility === "publica") || plans[0];
              setPlans((prev) =>
                prev.map((p) =>
                  p.id === previewPlan.id
                    ? { ...p, participants: [...p.participants, { userId: null, name: guestName, guestName, rsvp: "yes", show: true }] }
                    : p
                )
              );
            }}
          />
        ) : openPlan ? (
          <PlanDetail
            plan={openPlan}
            onBack={() => {
              setOpenPlanId(null);
              setOpenPlanInitialTab(null);
            }}
            onUpdate={updatePlan}
            onEdit={(p) => setEditingPlan(p)}
            onDelete={deletePlan}
            initialTab={openPlanInitialTab}
            templates={listTemplates}
            onSaveTemplate={saveListTemplate}
            onDeleteTemplate={deleteListTemplate}
            onNotifyPayment={notifyPayment}
          />
        ) : (
          <>
            <div style={{ padding: "16px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#161B2E" }}>
              <div
                onClick={() => navigateTo("inicio")}
                style={{ fontFamily: "Poppins, sans-serif", fontSize: 19, fontWeight: 700, color: "#fff", letterSpacing: 0.3, cursor: "pointer" }}
              >
                cantixplora
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {tab === "inicio" && (
                <InicioView
                  plans={plans}
                  reminders={reminders}
                  profile={profile}
                  onOpenPlan={(id) => openPlanNormal(id)}
                  onGoToPlanes={() => setTab("planes")}
                  onCreatePlan={() => setShowNewPlan(true)}
                  onSelectDay={(date) => setSelectedDay(date)}
                  onToggleReminderDone={toggleReminderDone}
                  onQuickAddEvent={openEventFromDay}
                  onQuickAddReminder={quickAddReminder}
                  myPendingExpense={myPendingExpense}
                />
              )}

              {tab === "planes" && (
                <PlanesView
                  plans={plans}
                  onOpenPlan={(p) => openPlanNormal(p.id)}
                  typeFilter={planesTypeFilter}
                  setTypeFilter={setPlanesTypeFilter}
                  dateFrom={planesDateFrom}
                  setDateFrom={setPlanesDateFrom}
                  dateTo={planesDateTo}
                  setDateTo={setPlanesDateTo}
                  showFilters={planesShowFilters}
                  setShowFilters={setPlanesShowFilters}
                />
              )}

              {tab === "perfil" && (
                <ProfileView
                  profile={profile}
                  onSave={setProfile}
                  templates={listTemplates}
                  onSaveTemplate={saveListTemplate}
                  onUpdateTemplate={updateListTemplate}
                  onDeleteTemplate={deleteListTemplate}
                />
              )}

              {tab === "amigos" && (
                <AmigosView
                  requests={friendRequests}
                  setRequests={setFriendRequests}
                  notifications={notifications}
                  onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                  plans={plans}
                  onProposePlan={proposePlanFromAvailability}
                  onOpenNotification={openNotification}
                />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", borderTop: "1px solid #E6E6E3", background: "#fff", position: "relative" }}>
              {[
                { key: "inicio", label: "Inicio", icon: Home },
                { key: "planes", label: "Planes", icon: ListChecks },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      padding: "10px 0",
                      cursor: "pointer",
                      color: tab === t.key ? "#161B2E" : "#B8B2A0",
                    }}
                  >
                    <Icon size={19} />
                    <span style={{ fontSize: 9, fontWeight: tab === t.key ? 700 : 500 }}>{t.label}</span>
                  </div>
                );
              })}

              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowNewPlan(true)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: "#FF5A3C",
                    border: "none",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 3px 8px rgba(255,90,60,0.25)",
                    cursor: "pointer",
                    marginTop: -34,
                    marginBottom: 14,
                  }}
                >
                  <Plus size={24} />
                </button>
              </div>

              {[
                { key: "amigos", label: "Amigos", icon: Heart },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      padding: "10px 0",
                      cursor: "pointer",
                      color: tab === t.key ? "#161B2E" : "#B8B2A0",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <Icon size={19} fill={tab === t.key && t.key === "amigos" ? "#161B2E" : "none"} />
                      {t.key === "amigos" && (friendRequests.length + notifications.filter((n) => !n.read).length) > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -6,
                            background: "#FF5A3C",
                            color: "#fff",
                            borderRadius: "50%",
                            minWidth: 14,
                            height: 14,
                            fontSize: 8.5,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1.5px solid #fff",
                            padding: "0 2px",
                          }}
                        >
                          {friendRequests.length + notifications.filter((n) => !n.read).length}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: tab === t.key ? 700 : 500 }}>{t.label}</span>
                  </div>
                );
              })}

              <div
                onClick={() => setTab("perfil")}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "10px 0",
                  cursor: "pointer",
                  color: tab === "perfil" ? "#161B2E" : "#B8B2A0",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: profile.photo ? `url(${profile.photo}) center/cover` : "#FF5A3C",
                    border: tab === "perfil" ? "2px solid #161B2E" : "2px solid transparent",
                  }}
                >
                  {!profile.photo && (
                    <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>
                      {getInitials(profile.name)}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: tab === "perfil" ? 700 : 500 }}>Perfil</span>
              </div>
            </div>
          </>
        )}

        {showNewPlan && (
          <NewPlanModal
            initialDate={newPlanInitialDate}
            initialInvited={newPlanInitialInvited}
            onClose={() => {
              setShowNewPlan(false);
              setNewPlanInitialDate(null);
              setNewPlanInitialInvited([]);
            }}
            onCreate={(p) => {
              createPlan(p);
              setNewPlanInitialDate(null);
              setNewPlanInitialInvited([]);
            }}
          />
        )}
        {selectedDay && (
          <DaySheet
            date={selectedDay}
            plans={plans}
            reminders={reminders}
            onClose={() => {
              setSelectedDay(null);
              setDaySheetAutoReminder(false);
            }}
            onOpenPlan={(p) => {
              setSelectedDay(null);
              setDaySheetAutoReminder(false);
              setOpenPlanInitialTab(null);
              setOpenPlanId(p.id);
            }}
            onAddEvent={openEventFromDay}
            onAddReminder={addReminder}
            onUpdateReminder={updateReminder}
            onToggleReminderDone={toggleReminderDone}
            onDeleteReminder={deleteReminder}
            initialShowReminderForm={daySheetAutoReminder}
            templates={listTemplates}
          />
        )}

        {pendingDeletePlan && (
          <div
            style={{
              position: "absolute",
              bottom: 90,
              left: 16,
              right: 16,
              background: "#161B2E",
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 8px 20px rgba(22,27,46,0.3)",
              zIndex: 35,
            }}
          >
            <span style={{ color: "#fff", fontSize: 12 }}>Plan "{pendingDeletePlan.title}" eliminado</span>
            <button
              onClick={undoDeletePlan}
              style={{ background: "none", border: "none", color: "#FF5A3C", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              Deshacer
            </button>
          </div>
        )}
        {editingPlan && (
          <NewPlanModal
            existingPlan={editingPlan}
            onClose={() => setEditingPlan(null)}
            onCreate={saveEdit}
          />
        )}
      </div>
    </div>
  );
}
