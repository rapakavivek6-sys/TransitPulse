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

df = df.dropna(subset=["occupancy"])

X = df[[
    "route_id",
    "current_stop_index",
    "occupancy",
    "capacity",
    "status",
    "traffic_level",
    "traffic_multiplier"
]]

y = df["occupancy"]

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

    print(f"Occupancy MAE: {mae:.2f}")
    print(f"Occupancy RMSE: {rmse:.2f}")
else:
    model.fit(X, y)
    print("Very small dataset: trained on all available rows.")

joblib.dump(model, "ml/models/occupancy_model.joblib")
print("Model saved to ml/models/occupancy_model.joblib")