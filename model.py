import torch.nn as nn
from torchvision.models import mobilenet_v2


# [추가 9월 2일 14:55] 학습 당시와 동일한 MobileNetV2 모델 구조 생성
def create_mobilenet_model():
    model = mobilenet_v2(weights=None)

    # [추가 9월 2일 14:55] other / hornet 2개 클래스로 분류하도록 classifier 변경
    model.classifier[1] = nn.Linear(
        model.classifier[1].in_features,
        2
    )

    return model
