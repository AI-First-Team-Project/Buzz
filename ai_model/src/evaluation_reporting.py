"""Persist reproducible model-comparison artifacts after training.

The test set is intentionally not used to rank models. Validation artifacts compare
all candidates; test artifacts describe only the method selected on validation.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import confusion_matrix


def _json_value(value):
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, np.ndarray):
        return [_json_value(item) for item in value.tolist()]
    if isinstance(value, np.generic):
        return value.item()
    return value


def _save_figure(figure, path):
    figure.tight_layout()
    figure.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(figure)


def add_error_rates(results):
    """Add rates needed to compare errors across differently sized splits."""
    frame = pd.DataFrame(results).copy()
    required = {"Model", "False Negative", "False Positive", "Wasp Support", "Non Wasp Support"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing reporting columns: {sorted(missing)}")
    frame["False Negative Rate"] = frame["False Negative"] / frame["Wasp Support"].replace(0, np.nan)
    frame["False Positive Rate"] = frame["False Positive"] / frame["Non Wasp Support"].replace(0, np.nan)
    return frame


def save_validation_report(results, output_dir):
    """Save six-model validation metrics and a recall/F1 comparison chart."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    frame = add_error_rates(results).sort_values(
        ["Wasp Recall", "Macro F1"], ascending=[False, False]
    ).reset_index(drop=True)
    frame.to_csv(output_dir / "validation_model_metrics.csv", index=False)
    (output_dir / "validation_model_metrics.json").write_text(
        json.dumps(_json_value(frame.to_dict(orient="records")), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    score_columns = ["Wasp Recall", "Macro F1"]
    plotted = frame.melt(id_vars="Model", value_vars=score_columns,
                         var_name="Metric", value_name="Score")
    figure, axis = plt.subplots(figsize=(12, 6))
    sns.barplot(data=plotted, x="Model", y="Score", hue="Metric", ax=axis)
    # All models score above 0.97, so zoom the y-axis to make small differences visible.
    # Exact percentages are printed on every bar to keep the truncated axis unambiguous.
    axis.set_ylim(0.97, 1.001)
    axis.set_yticks(np.arange(0.97, 1.001, 0.005))
    axis.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=1))
    axis.set_title("Six-model validation comparison: Wasp Recall and Macro F1\n"
                   "Zoomed y-axis (97%–100%)")
    axis.set_ylabel("Score (%)")
    for container in axis.containers:
        axis.bar_label(
            container,
            labels=[f"{bar.get_height() * 100:.2f}%" for bar in container],
            padding=3,
            fontsize=8,
            rotation=90,
        )
    axis.tick_params(axis="x", rotation=20)
    axis.grid(axis="y", alpha=0.25)
    _save_figure(figure, output_dir / "validation_model_comparison.png")

    return frame


def save_training_histories(histories, output_dir):
    """Save DL histories and a combined loss/accuracy chart."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    serializable = {}
    figure, axes = plt.subplots(1, 2, figsize=(13, 5))
    for model_name, history in histories.items():
        values = history.history if hasattr(history, "history") else history
        serializable[model_name] = _json_value(values)
        epochs = np.arange(1, len(values.get("loss", [])) + 1)
        axes[0].plot(epochs, values.get("loss", []), label=f"{model_name} train")
        axes[0].plot(epochs, values.get("val_loss", []), linestyle="--",
                     label=f"{model_name} validation")
        axes[1].plot(epochs, values.get("accuracy", []), label=f"{model_name} train")
        axes[1].plot(epochs, values.get("val_accuracy", []), linestyle="--",
                     label=f"{model_name} validation")
    axes[0].set(title="Training and validation loss", xlabel="Epoch", ylabel="Loss")
    axes[1].set(title="Training and validation accuracy", xlabel="Epoch", ylabel="Accuracy")
    axes[1].set_ylim(0, 1.02)
    for axis in axes:
        axis.grid(alpha=0.25)
        axis.legend(fontsize=8)
    _save_figure(figure, output_dir / "deep_learning_histories.png")
    (output_dir / "deep_learning_histories.json").write_text(
        json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def save_prediction_manifest(paths, source_ids, labels, probabilities_by_model, split, output_dir):
    """Save clip probabilities so errors can be audited by source later."""
    paths = list(map(str, paths))
    source_ids = list(map(str, source_ids))
    labels = np.asarray(labels, dtype=np.int32)
    if not (len(paths) == len(source_ids) == len(labels)):
        raise ValueError("paths, source_ids, and labels must have equal lengths")
    frame = pd.DataFrame({"split": split, "path": paths, "source_id": source_ids,
                          "label": labels})
    for model_name, probabilities in probabilities_by_model.items():
        probabilities = np.asarray(probabilities)
        if probabilities.shape != (len(frame), 2):
            raise ValueError(f"{model_name} probabilities must have shape ({len(frame)}, 2)")
        key = model_name.lower().replace(" ", "_")
        frame[f"{key}_non_wasp_probability"] = probabilities[:, 0]
        frame[f"{key}_wasp_probability"] = probabilities[:, 1]
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output_dir / f"{split}_predictions.csv", index=False)
    return frame


def save_source_report(prediction_frame, model_name, threshold, output_dir):
    """Save per-source recall/error counts for a selected probability column."""
    key = model_name.lower().replace(" ", "_")
    probability_column = f"{key}_wasp_probability"
    if probability_column not in prediction_frame:
        raise ValueError(f"Missing column: {probability_column}")
    frame = prediction_frame.copy()
    frame["prediction"] = (frame[probability_column] >= threshold).astype(np.int32)
    frame["false_negative"] = ((frame.label == 1) & (frame.prediction == 0)).astype(np.int32)
    frame["false_positive"] = ((frame.label == 0) & (frame.prediction == 1)).astype(np.int32)
    grouped = frame.groupby(["split", "source_id", "label"], as_index=False).agg(
        clips=("label", "size"),
        mean_wasp_probability=(probability_column, "mean"),
        false_negative=("false_negative", "sum"),
        false_positive=("false_positive", "sum"),
    )
    grouped["recall"] = np.where(
        grouped.label == 1, 1 - grouped.false_negative / grouped.clips, np.nan
    )
    output_dir = Path(output_dir)
    grouped.to_csv(output_dir / f"{frame['split'].iloc[0]}_{key}_source_metrics.csv", index=False)
    return grouped


def save_confusion_matrix(y_true, y_pred, model_name, split, output_dir):
    matrix = confusion_matrix(y_true, y_pred, labels=[0, 1])
    figure, axis = plt.subplots(figsize=(5, 4))
    sns.heatmap(matrix, annot=True, fmt="d", cmap="Blues",
                xticklabels=["non_wasp", "wasp"],
                yticklabels=["non_wasp", "wasp"], ax=axis)
    axis.set(title=f"{model_name} {split} confusion matrix",
             xlabel="Prediction", ylabel="Actual")
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    _save_figure(figure, output_dir / f"{split}_{model_name.lower()}_confusion_matrix.png")
