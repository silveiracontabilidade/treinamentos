from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_treinamento_auto_atualizacao"),
    ]

    operations = [
        migrations.AddField(
            model_name="modulo",
            name="video_origem",
            field=models.CharField(
                choices=[
                    ("youtube", "YouTube"),
                    ("canva", "Canva"),
                    ("iframe", "Outro/Iframe"),
                ],
                default="youtube",
                max_length=20,
            ),
        ),
    ]
