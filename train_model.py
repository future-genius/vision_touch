import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

# Load dataset
data = pd.read_csv("gesture_data.csv", header=None)

X = data.iloc[:, :-1]
y = data.iloc[:, -1]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Accuracy
accuracy = model.score(X_test, y_test)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# Save model
joblib.dump(model, "gesture_model.pkl")
print("Model saved as gesture_model.pkl")
