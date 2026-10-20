
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Leaf,
  LoaderCircle,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { api } from "./services/api.js";
import BotReply from "./botReply.jsx";

const examplePrompts = [
  "Two flatmates cancelled dinner tonight. Can we make something with what we already have?",
  "We cancelled Cheesy Tomato Pasta. Find a replacement using our ingredients.",
  "Help us avoid wasting the tomatoes and eggs we have.",
];

function titleCase(value = "") {
  return String(value).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getName(item) {
  return item?.name || item?.ingredientName || item?.itemName || "Ingredient";
}

function getQuantity(item) {
  const n = Number(item?.quantity ?? item?.available ?? item?.amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getUnit(item) {
  return item?.unit || item?.measurementUnit || "";
}

function getMealId(meal, index) {
  return meal?.legacyId ?? meal?.id ?? meal?._id ?? meal?.mealId ?? index + 1;
}

function getMealIngredients(meal) {
  return Array.isArray(meal?.ingredients) ? meal.ingredients : [];
}

function prettyQty(n) {
  return Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1);
}

function ErrorBanner({ children, onDismiss }) {
  return (
    <div className="error-banner" role="alert">
      <CircleHelp size={17} />
      <span>{children}</span>
      {onDismiss && (
        <button className="icon-button" onClick={onDismiss} aria-label="Dismiss error">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function App() {
  const [household, setHousehold] = useState(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [householdError, setHouseholdError] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [message, setMessage] = useState("");
  const [selectedMealId, setSelectedMealId] = useState("");
  const [peopleCancelled, setPeopleCancelled] = useState(1);
  const [proposal, setProposal] = useState(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      text: "Hey! I'm MealMend, your kitchen companion. When dinner plans change, I'll help you find another meal using ingredients you already have. Let's make less go to waste!",
    },
  ]);

  const loadHousehold = useCallback(async () => {
    setLoadingHousehold(true);
    setHouseholdError("");

    try {
      const data = await api.getHousehold();
      setHousehold(data);

      const loadedMeals = Array.isArray(data?.meals) ? data.meals : [];

      setSelectedMealId((currentId) => {
        if (currentId && loadedMeals.some((meal, index) =>
          String(getMealId(meal, index)) === String(currentId)
        )) {
          return currentId;
        }

        return loadedMeals.length ? String(getMealId(loadedMeals[0], 0)) : "";
      });
    } catch (error) {
      setHouseholdError(error.message || "Unable to load your household.");
    } finally {
      setLoadingHousehold(false);
    }
  }, []);

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  const inventory = Array.isArray(household?.inventory) ? household.inventory : [];
  const meals = Array.isArray(household?.meals) ? household.meals : [];
  const flatmates = Array.isArray(household?.flatmates) ? household.flatmates : [];

  const selectedMeal = useMemo(
    () => meals.find(
      (meal, index) => String(getMealId(meal, index)) === String(selectedMealId)
    ),
    [meals, selectedMealId]
  );

  const totalItems = inventory.length;
  const lowItems = inventory.filter((item) => getQuantity(item) <= 100).length;

  const submitProposal = async (event) => {
    event?.preventDefault();

    const text = message.trim();

    if (!text) {
      setProposalMessage("Please enter a message for MealMend.");
      return;
    }

    const isRecoveryRequest =
      /\b(cancel(?:led|ed|lation)?\s+(?:dinner|meal|plans?)|(?:dinner|meal)\s+(?:was\s+)?cancelled|(?:dinner|meal)\s+plans?\s+(?:have\s+)?changed|changed\s+(?:our\s+)?(?:dinner|meal)\s+plans?|find\s+a\s+replacement|recover\s+(?:the\s+)?meal|fewer\s+people|no\s+longer\s+cooking|can't\s+make\s+dinner|cannot\s+make\s+dinner)\b/i.test(text);

    setBusy(isRecoveryRequest ? "proposal" : "chat");
    setProposalMessage("");
    setNotice("");
    setProposal(null);
    setChatHistory((old) => [...old, { role: "user", text }]);

    try {
      
if (!isRecoveryRequest) {
  const response = await fetch("http://127.0.0.1:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: text }),
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error || result.message || "Could not process your question."
    );
  }

  const reply =
    result.reply ||
    result.summary ||
    result.message ||
    "Here's what I found for your household.";

  setChatHistory((old) => [
    ...old,
    { role: "assistant", text: reply },
  ]);

  // Show inventory or grocery details if the backend returned them.
  if (result.inventory?.length) {
    setChatHistory((old) => [
      ...old,
      {
        role: "assistant",
        text: result.inventory
          .map((item) =>
            `${item.name}: ${item.quantity} ${item.unit || ""}`.trim()
          )
          .join("\n"),
      },
    ]);
  }

  if (result.details) {
    const details = result.details;
    const lines = [];

    if (details.useSoon?.length) {
      lines.push(
        "INGREDIENTS TO USE SOON",
        ...details.useSoon.map((item) =>
          `• ${item.name} — ${item.quantity} ${item.unit || ""}; ${
            item.recommendation || "Check its expiry date."
          }`
        )
      );
    }

    if (details.shoppingList?.length) {
      lines.push(
        "",
        "GROCERY SHOPPING LIST",
        ...details.shoppingList.map((item) =>
          `• ${item.name}: buy ${item.neededToBuy} ${item.unit || ""}`
        )
      );
    } else {
      lines.push("", "Your planned meals don't require any additional purchases.");
    }

    if (lines.length) {
      setChatHistory((old) => [
        ...old,
        { role: "assistant", text: lines.join("\n") },
      ]);
    }
  }

  setMessage("");
  return;
}


      if (!selectedMeal) {
        throw new Error("Choose the cancelled meal first.");
      }

      const result = await api.getProposal({
        cancelledMealId: getMealId(selectedMeal, meals.indexOf(selectedMeal)),
        cancelledMealName: selectedMeal.name,
        peopleCancelled: Number(peopleCancelled),
        message: `${peopleCancelled} flatmate(s) cancelled dinner. We need to replace ${selectedMeal.name}. ${text}`,
      });

      if (result?.success === false) {
        throw new Error(result.message || result.error || "No replacement could be proposed.");
      }

      setProposal(result);

      setChatHistory((old) => [
        ...old,
        {
          role: "assistant",
          text: result.message || result.reply ||
            "I've prepared a recovery proposal. Review it before confirming.",
        },
      ]);

      setMessage("");
    } catch (error) {
      setProposalMessage(error.message || "Something went wrong.");

      setChatHistory((old) => [
        ...old,
        {
          role: "assistant",
          text: `I couldn't process your request: ${error.message}`,
        },
      ]);
    } finally {
      setBusy("");
    }
  };

  const cancelProposal = () => {
    setProposal(null);
    setNotice("Proposal dismissed. Your inventory has not been changed.");
    setProposalMessage("");
  };

  const confirmProposal = async () => {
    if (!proposal) return;

    const replacement =
      proposal.replacementMeal || proposal.replacement || proposal.proposedMeal;

    const replacementName = typeof replacement === "string"
      ? replacement
      : replacement?.name || proposal.replacementMealName || proposal.replacementName;

    if (!replacementName) {
      setProposalMessage("The proposal doesn't include a replacement meal name.");
      return;
    }

    setBusy("confirm");
    setProposalMessage("");
    setNotice("");

    try {
      const result = await api.confirmRecovery({
        recoveryRequestId: proposal.recoveryRequestId,
        cancelledMealId:
          proposal.cancelledMealId ??
          getMealId(selectedMeal, meals.indexOf(selectedMeal)),
        replacementMeal: replacementName,
        peopleCancelled: Number(
          proposal.intent?.peopleCancelled ??
          proposal.peopleCancelled ??
          peopleCancelled
        ),
      });

      if (result?.success === false) {
        throw new Error(result.message || result.error || "The backend did not confirm the recovery.");
      }

      setProposal(null);
      setNotice(
        `Recovery confirmed — ${result?.replacementMeal?.name || replacementName}. Household data has been refreshed.`
      );

      setChatHistory((old) => [
        ...old,
        {
          role: "assistant",
          text: "Recovery confirmed! I've refreshed your household data so the inventory reflects the saved result.",
        },
      ]);

      await loadHousehold();
    } catch (error) {
      setProposalMessage(error.message || "Recovery confirmation failed.");
    } finally {
      setBusy("");
    }
  };

  const scrollToRecovery = () => {
    setActiveNav("Recovery assistant");
    document.getElementById("recovery")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const proposalReplacement =
    proposal?.replacementMeal || proposal?.replacement || proposal?.proposedMeal;

  const replacementName = typeof proposalReplacement === "string"
    ? proposalReplacement
    : proposalReplacement?.name ||
      proposal?.replacementMealName ||
      proposal?.replacementName ||
      "Replacement meal";

  const ingredientsUsed =
    proposal?.ingredientsUsed ||
    proposalReplacement?.ingredients ||
    proposal?.replacementIngredients ||
    [];

  const projectedInventory =
    proposal?.projectedInventory ||
    proposal?.inventoryAfter ||
    proposal?.projectedInventoryAfter;

  const beforeInventory = proposal?.currentInventory || inventory;

  return (
    <div className="app-shell" id="top">
      <aside className="sidebar">
        <a className="brand" href="#top" onClick={() => setActiveNav("Overview")}>
          <span className="brand-mark"><Leaf size={23} strokeWidth={2.5} /></span>
          <span>
            <strong>MealMend</strong>
            <small>AI MEAL RECOVERY</small>
          </span>
        </a>

        <div className="workspace-label">YOUR KITCHEN</div>

        <nav className="nav-list" aria-label="Main navigation">
          {[
            { name: "Overview", icon: Zap, target: "top" },
            { name: "Inventory", icon: Package, target: "inventory" },
            { name: "Meal planner", icon: Utensils, target: "meals" },
            { name: "Recovery assistant", icon: MessageCircle, target: "recovery" },
          ].map(({ name, icon: Icon, target }) => (
            <button
              key={name}
              className={`nav-item ${activeNav === name ? "active" : ""}`}
              onClick={() => {
                setActiveNav(name);
                document.getElementById(target)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Recovery assistant" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="impact-card">
            <span className="impact-icon"><Leaf size={18} /></span>
            <strong>Plans change.<br />Dinner finds a way.</strong>
            <p>Make another meal possible with the ingredients you already have.</p>
            <div className="impact-progress"><span /></div>
            <small>LESS WASTE, ONE MEAL AT A TIME</small>
          </div>

          <div className="profile">
            <div className="avatar">H</div>
            <div>
              <strong>Shared household</strong>
              <small>Home workspace</small>
            </div>
            <ChevronDown size={16} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            MealMend <span>/</span> <strong>{activeNav}</strong>
          </div>
          <div className="topbar-right">
            <span className="live-status"><i /> Connected workspace</span>
            <button
              className="icon-button refresh-button"
              onClick={loadHousehold}
              title="Refresh household data"
              aria-label="Refresh household data"
              disabled={loadingHousehold}
            >
              <RefreshCw size={17} />
            </button>
            <div className="avatar avatar-small">H</div>
          </div>
        </header>

        <div className="page-wrap">
          {householdError && (
            <ErrorBanner onDismiss={() => setHouseholdError("")}>
              {householdError}
            </ErrorBanner>
          )}

          {notice && (
            <div className="success-banner">
              <Check size={17} />
              <span>{notice}</span>
              <button className="icon-button" onClick={() => setNotice("")} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}

          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR SHARED KITCHEN
              </div>
              <h1>Plans change.<br /><em>Dinner finds a way.</em></h1>
              <p className="welcome-copy">
                Make the most of the ingredients you already have.
                <br className="desktop-break" />
                Turn unexpected changes into your next great meal.
              </p>
              <button className="hero-cta" onClick={scrollToRecovery}>
                Mend tonight's dinner <ArrowRight size={16} />
              </button>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="hero-sun" />
              <div className="hero-leaf leaf-one"><Leaf size={58} /></div>
              <div className="hero-leaf leaf-two"><Leaf size={37} /></div>
              <div className="hero-bowl">
                <div className="bowl-food">
                  <span /><span /><span /><span /><span />
                </div>
              </div>
              <div className="hero-sprout"><Leaf size={26} /></div>
              <div className="floating-note"><Sparkles size={14} /> MADE WITH WHAT YOU HAVE</div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Household summary">
            <div className="stat-card">
              <div className="stat-icon green"><Package size={19} /></div>
              <div className="stat-label">Ingredients on hand</div>
              <div className="stat-bottom">
                <strong>{loadingHousehold ? "—" : totalItems}</strong>
                <span className="stat-note">tracked items</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon peach"><Utensils size={19} /></div>
              <div className="stat-label">Meals planned</div>
              <div className="stat-bottom">
                <strong>{loadingHousehold ? "—" : meals.length}</strong>
                <span className="stat-note">in your planner</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon yellow"><Users size={19} /></div>
              <div className="stat-label">Household members</div>
              <div className="stat-bottom">
                <strong>{loadingHousehold ? "—" : flatmates.length}</strong>
                <span className="stat-note">sharing the kitchen</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue"><Leaf size={19} /></div>
              <div className="stat-label">Use-it-up watchlist</div>
              <div className="stat-bottom">
                <strong>{loadingHousehold ? "—" : lowItems}</strong>
                <span className="stat-note">low-stock items*</span>
              </div>
            </div>
          </section>

          <p className="micro-note">*Items with 100 units or less are highlighted as low stock.</p>

          <section className="section-block" id="inventory">
            <div className="section-heading">
              <div>
                <div className="eyebrow">WHAT YOU ALREADY HAVE</div>
                <h2>Your kitchen inventory <span className="heading-count">{inventory.length}</span></h2>
              </div>
              <button className="text-button" onClick={() => setActiveNav("Inventory")}>
                Live inventory <ArrowRight size={15} />
              </button>
            </div>

            {loadingHousehold ? (
              <div className="skeleton-grid"><div /><div /><div /><div /></div>
            ) : inventory.length ? (
              <div className="inventory-grid">
                {inventory.map((item, index) => {
                  const quantity = getQuantity(item);
                  const expiring = item.expiryDate || item.expiry;

                  return (
                    <article className="ingredient-card" key={item._id || `${getName(item)}-${index}`}>
                      <div className={`ingredient-illustration ingredient-${index % 6}`}>
                        <span>{getName(item).slice(0, 1).toUpperCase()}</span>
                      </div>
                      <div className="ingredient-info">
                        <strong>{titleCase(getName(item))}</strong>
                        <span className={quantity <= 100 ? "quantity low" : "quantity"}>
                          {prettyQty(quantity)} {getUnit(item)}
                        </span>
                        {expiring && (
                          <small className="expiry-label">
                            Use by {new Date(expiring).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </small>
                        )}
                      </div>
                      <span
                        className={`stock-dot ${quantity <= 100 ? "low-dot" : ""}`}
                        title={quantity <= 100 ? "Low stock" : "In stock"}
                      />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Package size={24} />
                <strong>No inventory found</strong>
                <span>Your household ingredients will appear here.</span>
              </div>
            )}
          </section>

          <section className="section-block meals-section" id="meals">
            <div className="section-heading">
              <div>
                <div className="eyebrow">A LITTLE PLAN GOES A LONG WAY</div>
                <h2>Coming up in your kitchen</h2>
              </div>
              <span className="soft-tag"><Clock3 size={14} /> Planned meals</span>
            </div>

            {loadingHousehold ? (
              <div className="skeleton-grid"><div /><div /></div>
            ) : meals.length ? (
              <div className="meal-grid">
                {meals.map((meal, index) => (
                  <article className="meal-card" key={meal._id || getMealId(meal, index)}>
                    <div className={`meal-art meal-art-${index % 3}`}>
                      <div className="meal-art-bowl"><span /><span /><span /></div>
                      <span className="meal-day">{titleCase(meal.day || "Planned")}</span>
                    </div>
                    <div className="meal-body">
                      <div className="meal-meta">
                        <span><Clock3 size={13} />{meal.cookingTime ?? meal.cooking_time ?? "—"} min</span>
                        <span><Users size={13} />{meal.servings ?? 2} servings</span>
                      </div>
                      <h3>{meal.name || "Planned meal"}</h3>
                      <p>
                        {getMealIngredients(meal).slice(0, 3).map((ingredient) =>
                          titleCase(ingredient.name)
                        ).join(" · ") || "Ingredients from your shared kitchen"}
                      </p>
                      <button
                        className="meal-action"
                        onClick={() => {
                          setSelectedMealId(String(getMealId(meal, index)));
                          setMessage(`We need to change ${meal.name || "our planned meal"}. Find a replacement using what we have.`);
                          scrollToRecovery();
                        }}
                      >
                        Recover this meal <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Utensils size={24} />
                <strong>No planned meals yet</strong>
                <span>Your planned meals will appear here.</span>
              </div>
            )}
          </section>

          <section className="recovery-section" id="recovery">
            <div className="recovery-intro">
              <div className="eyebrow light-eyebrow">
                <Sparkles size={14} /> YOUR AI KITCHEN COMPANION
              </div>
              <h2>Dinner plans changed?<br /><em>Let's mend them.</em></h2>
              <p>
                Tell MealMend what happened. Your AI kitchen companion will check
                your planned meal and available ingredients before suggesting a
                practical alternative.
              </p>
              <div className="recovery-points">
                <span><Check size={15} /> Works with your inventory</span>
                <span><Check size={15} /> You stay in control</span>
              </div>
              <div className="recovery-decoration"><Leaf size={112} /></div>
            </div>

            <div className="chat-panel">
              <div className="chat-header">
                <div className="assistant-avatar"><Leaf size={19} /></div>
                <div>
                  <strong>MealMend assistant</strong>
                  <small><i /> Ready to help</small>
                </div>
                <span className="powered-label"><Sparkles size={13} /> AI-ASSISTED</span>
              </div>

              <div className="chat-messages" aria-live="polite">
                {chatHistory.map((item, index) => (
                  <div className={`chat-row ${item.role}`} key={`${item.role}-${index}`}>
                    {item.role === "assistant" && (
                      <div className="chat-avatar"><Leaf size={15} /></div>
                    )}
                    <div className="chat-bubble">
                      {item.role === "assistant" ? (
                        <BotReply reply={item.text} />
                      ) : (
                        item.text
                      )}
                    </div>
                  </div>
                ))}
                {(busy === "proposal" || busy === "chat") && (
                  <div className="chat-row assistant">
                    <div className="chat-avatar"><Leaf size={15} /></div>
                    <div className="chat-bubble thinking">
                      <span /><span /><span /> Checking your kitchen…
                    </div>
                  </div>
                )}
              </div>

              <form className="chat-compose" onSubmit={submitProposal}>
                <label className="field-label" htmlFor="cancelled-meal">Which meal changed?</label>
                <div className="select-wrap">
                  <select
                    id="cancelled-meal"
                    value={selectedMealId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const nextMeal = meals.find(
                        (meal, index) => String(getMealId(meal, index)) === nextId
                      );

                      setSelectedMealId(nextId);

                      if (nextMeal) {
                        setMessage((old) =>
                          old.trim()
                            ? old.replace(
                                /We cancelled .+?\. Find a replacement using our ingredients\.?/i,
                                `We cancelled ${nextMeal.name}. Find a replacement using our ingredients.`
                              )
                            : `We cancelled ${nextMeal.name}. Find a replacement using our ingredients.`
                        );
                      }
                    }}
                  >
                    {meals.length ? meals.map((meal, index) => (
                      <option
                        key={meal._id || getMealId(meal, index)}
                        value={String(getMealId(meal, index))}
                      >
                        {meal.name || `Meal ${index + 1}`}
                      </option>
                    )) : <option value="">No meals loaded</option>}
                  </select>
                  <ChevronDown size={16} />
                </div>

                <div className="field-label people-label">How many flatmates cancelled?</div>
                <div className="people-picker">
                  {[1, 2, 3].map((count) => (
                    <button
                      type="button"
                      key={count}
                      className={peopleCancelled === count ? "people-option selected" : "people-option"}
                      onClick={() => setPeopleCancelled(count)}
                    >
                      {count}
                    </button>
                  ))}
                  <span>person{peopleCancelled > 1 ? "s" : ""}</span>
                </div>

                <label className="field-label" htmlFor="recovery-message">Tell us what changed</label>
                <div className="message-box">
                  <textarea
                    id="recovery-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="e.g. Two flatmates cancelled dinner tonight…"
                    rows={3}
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={busy !== "" || !message.trim()}
                    aria-label="Send recovery request"
                  >
                    <Send size={17} />
                  </button>
                </div>

                <div className="compose-footer">
                  <span><Sparkles size={13} /> Suggestions use your household data.</span>
                  <span>{message.length}/500</span>
                </div>

                <div className="example-prompts">
                  {examplePrompts.slice(0, 2).map((example, index) => (
                    <button type="button" key={example} onClick={() => setMessage(example)}>
                      {index === 0 ? "Plans changed" : "Find a replacement"}
                      <ArrowDownRight size={13} />
                    </button>
                  ))}
                </div>
              </form>

              {proposalMessage && (
                <div className="inline-error">
                  <CircleHelp size={15} />{proposalMessage}
                </div>
              )}

              {proposal && (
                <div className="proposal-card">
                  <div className="proposal-title-row">
                    <div>
                      <span className="proposal-kicker"><Sparkles size={13} /> MEALMEND PROPOSAL</span>
                      <h3>{replacementName}</h3>
                    </div>
                    <span className="proposal-badge">Preview</span>
                  </div>

                  <p className="proposal-description">
                    Review this suggested recovery. Your inventory has not changed yet.
                  </p>

                  <div className="proposal-stats">
                    <span>
                      <Clock3 size={14} />
                      {proposalReplacement?.cookingTime ?? proposalReplacement?.cooking_time ?? proposal.cookingTime ?? "—"} min
                    </span>
                    <span>
                      <Users size={14} />
                      {proposalReplacement?.servings ?? proposal.servings ?? "—"} servings
                    </span>
                  </div>

                  {ingredientsUsed.length > 0 && (
                    <div className="proposal-subsection">
                      <strong>Ingredients to use</strong>
                      {ingredientsUsed.map((ingredient, index) => (
                        <div className="proposal-ingredient" key={`${ingredient.name}-${index}`}>
                          <span>{titleCase(ingredient.name)}</span>
                          <strong>{ingredient.quantity ?? ingredient.amount ?? "—"} {ingredient.unit || ""}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {Array.isArray(projectedInventory) && (
                    <div className="proposal-subsection">
                      <strong>Projected inventory after recovery</strong>
                      {projectedInventory.map((item, index) => {
                        const before = beforeInventory.find(
                          (candidate) => getName(candidate).toLowerCase() === getName(item).toLowerCase()
                        );
                        const delta = getQuantity(item) - (before ? getQuantity(before) : 0);

                        return (
                          <div className="proposal-ingredient" key={`${getName(item)}-${index}`}>
                            <span>{titleCase(getName(item))}</span>
                            <strong className={delta < 0 ? "quantity-down" : ""}>
                              {prettyQty(getQuantity(item))} {getUnit(item)}
                              {delta < 0 ? ` (${prettyQty(delta)})` : ""}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="proposal-actions">
                    <button className="button-secondary" onClick={cancelProposal} disabled={busy !== ""}>
                      <X size={16} /> Cancel
                    </button>
                    <button className="button-primary" onClick={confirmProposal} disabled={busy !== ""}>
                      {busy === "confirm"
                        ? <LoaderCircle className="spin" size={16} />
                        : <Check size={16} />}
                      {busy === "confirm" ? "Confirming…" : "Continue & confirm"}
                    </button>
                  </div>

                  <p className="confirmation-note">
                    <CircleHelp size={13} />
                    Inventory changes only after the backend confirms this recovery.
                  </p>
                </div>
              )}
            </div>
          </section>

          <footer className="footer">
            <a className="footer-brand" href="#top"><Leaf size={17} /> MealMend</a>
            <span>Plans change. Dinner finds a way.</span>
            <span className="footer-status"><i /> Household-first, waste-aware</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
