import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

df = pd.read_csv("ml/data/bus_training_data.csv")

df = df.dropna(subset=["next_eta_min"])

X = df[[
    "route_id",
    "current_stop_index",
    "occupancy",
    "capacity",
    "status",
    "traffic_level",
    "traffic_multiplier"
]]

y = df["next_eta_min"]

categorical_features = ["route_id", "status", "traffic_level"]
numeric_features = ["current_stop_index", "occupancy", "capacity", "traffic_multiplier"]

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore"))
])

numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="median"))
])

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", categorical_transformer, categorical_features),
        ("num", numeric_transformer, numeric_features)
    ]
)

model = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("regressor", RandomForestRegressor(n_estimators=100, random_state=42))
])

if len(df) > 3:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5

    print(f"MAE: {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
else:
    model.fit(X, y)
    print("Very small dataset: trained on all available rows.")

joblib.dump(model, "ml/models/eta_model.joblib")
print("Model saved to ml/models/eta_model.joblib")

cur.execute("""
INSERT INTO ml_models (
  model_name, prediction_type, model_version, file_path
)
VALUES (%s,%s,%s,%s)
""", (
    "linear_regression",
    "eta",
    "v1",
    "models/eta_model.pkl"
))

cur.execute("""
INSERT INTO ml_evaluations (
  model_name, prediction_type, mae, rmse, sample_size
)
VALUES (%s,%s,%s,%s,%s)
""", (
    "linear_regression",
    "eta",
    mae,
    rmse,
    len(y_test)
))