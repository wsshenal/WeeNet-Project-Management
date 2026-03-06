import pickle

# Load the encoder dictionary
with open('artifacts/label_encoder.pkl', 'rb') as f:
    encoder_dict = pickle.load(f)

# Print all the available encoders and their classes
for feature_name, encoder in encoder_dict.items():
    print(f"\n{feature_name}:")
    print(f"  Valid values: {list(encoder.classes_)}")
